"""Background task: poll Gmail inbox for bounce/NDR emails and auto-update email_logs."""

import asyncio
import email as email_lib
import imaplib
import logging
import re
import socket
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from . import crud, models
from .database import SessionLocal

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 60  # check every 1 minute (set to 300 for production)


class _IMAP4_SSL_IPv4(imaplib.IMAP4_SSL):
    """IMAP4_SSL that resolves the host to IPv4 before connecting.

    On AWS EC2, DNS may return AAAA (IPv6) records first. EC2 instances have no
    IPv6 interface by default, so the OS raises [Errno 99] Cannot assign requested
    address. Forcing AF_INET avoids this.

    Overrides _create_socket (Python 3.9+) rather than open() because in Python
    3.12+ 'file' is a read-only property — setting it in open() raises TypeError.
    """
    def _create_socket(self, timeout):
        infos = socket.getaddrinfo(self.host, self.port, socket.AF_INET, socket.SOCK_STREAM)
        _, _, _, _, sa = infos[0]
        raw_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        if timeout is not None:
            raw_sock.settimeout(timeout)
        raw_sock.connect(sa)
        return self.ssl_context.wrap_socket(raw_sock, server_hostname=self.host)


# ── NDR parsing ───────────────────────────────────────────────────────────────

_EMAIL_RE = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'

def _extract_failed_email(msg) -> str | None:
    """Return the failed recipient from a bounce message, or None if unparseable."""
    # Primary: machine-readable delivery-status MIME part (most reliable, RFC 3464)
    for part in msg.walk():
        if part.get_content_type() == 'message/delivery-status':
            payload = part.get_payload()
            chunks = []
            if isinstance(payload, list):
                for sub in payload:
                    chunks.append(sub.as_string() if hasattr(sub, 'as_string') else str(sub))
            else:
                chunks.append(str(payload))
            combined = '\n'.join(chunks)
            match = re.search(r'Final-Recipient\s*:\s*rfc822\s*;\s*(.+)', combined, re.IGNORECASE)
            if match:
                return match.group(1).strip().strip('<>').lower()

    # Fallback: scan text/plain parts.
    # Gmail's current "Address not found" NDR says:
    #   "Your message wasn't delivered to EMAIL because..."
    # Older format:
    #   "Your message to EMAIL couldn't be delivered"
    # Other common patterns follow.
    text_patterns = [
        # Gmail current (2024+): "wasn't delivered to EMAIL"
        # Use ['’] to handle both ASCII apostrophe and Unicode right-quote
        rf"wasn['’]t delivered to\s+({_EMAIL_RE})",
        # Gmail older: "Your message to EMAIL couldn't be delivered"
        rf"Your message to\s+({_EMAIL_RE})\s+couldn['’]t be delivered",
        # Generic: "EMAIL does not exist"
        rf"({_EMAIL_RE})\s+does not exist",
        # Generic: "failed / undeliverable … to EMAIL"
        rf"(?:failed|undeliverable|not delivered)[^\n]*?to\s+({_EMAIL_RE})",
        # Last resort: any email on a line containing "failed" or "bounce"
        rf"(?:failed|bounce|rejected)[^\n]*({_EMAIL_RE})",
    ]

    for part in msg.walk():
        if part.get_content_type() != 'text/plain':
            continue
        try:
            text = part.get_payload(decode=True).decode('utf-8', errors='replace')
        except Exception:
            continue
        for pattern in text_patterns:
            m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if m:
                # Use the first non-None capturing group (patterns have exactly one)
                email = next((g for g in m.groups() if g), None)
                if email:
                    return email.strip().lower()

    return None


def _extract_reason(msg) -> str:
    """Return a short human-readable reason from the NDR."""
    for part in msg.walk():
        if part.get_content_type() == 'message/delivery-status':
            payload = part.get_payload()
            chunks = []
            if isinstance(payload, list):
                for sub in payload:
                    chunks.append(sub.as_string() if hasattr(sub, 'as_string') else str(sub))
            else:
                chunks.append(str(payload))
            combined = '\n'.join(chunks)
            # Diagnostic-Code line has the raw SMTP error
            m = re.search(r'Diagnostic-Code\s*:\s*(.+)', combined, re.IGNORECASE)
            if m:
                return m.group(1).strip()
            # Status code
            m = re.search(r'^Status\s*:\s*(.+)', combined, re.IGNORECASE | re.MULTILINE)
            if m:
                return f"SMTP status {m.group(1).strip()} — delivery failed"
    return "Delivery failed — address does not exist or mailbox unavailable"


# ── IMAP check ────────────────────────────────────────────────────────────────

def check_bounces_once(db: Session) -> int:
    """
    Connect to Gmail IMAP, find unread NDR emails, and update matching
    email_log rows to status='failed'. Returns count of records updated.
    """
    settings = crud.get_company_settings(db)
    if not (settings and settings.smtp_user and settings.smtp_password):
        return 0

    updated = 0
    try:
        mail = _IMAP4_SSL_IPv4('imap.gmail.com', 993)
        mail.login(settings.smtp_user, settings.smtp_password)
        mail.select('INBOX')

        # Search last 7 days — no UNSEEN filter so we catch bounces the user
        # already read in the Gmail browser before the monitor ran.
        # Messages we process are marked \Seen afterwards so they won't be
        # re-fetched on the next cycle (db query for status='sent' also guards).
        since = (datetime.utcnow() - timedelta(days=7)).strftime('%d-%b-%Y')
        ids: set[bytes] = set()
        for criterion in [
            f'FROM "mailer-daemon@googlemail.com" SINCE {since}',
            f'FROM "mailer-daemon@google.com" SINCE {since}',
            f'FROM "mailer-daemon@gmail.com" SINCE {since}',
            f'FROM "postmaster@google.com" SINCE {since}',
            f'SUBJECT "Delivery Status Notification" SINCE {since}',
            f'SUBJECT "Address not found" SINCE {since}',
            f'SUBJECT "Undelivered Mail" SINCE {since}',
            f'SUBJECT "Mail delivery failed" SINCE {since}',
        ]:
            try:
                _, data = mail.search(None, criterion)
                if data and data[0]:
                    ids.update(data[0].split())
            except Exception:
                pass

        logger.info("Bounce monitor: %d candidate NDR message(s) found in inbox", len(ids))

        for msg_id in ids:
            try:
                _, msg_data = mail.fetch(msg_id, '(RFC822)')
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)

                subject = msg.get('Subject', '(no subject)')
                sender  = msg.get('From', '(unknown)')
                logger.info("Bounce monitor: processing NDR — From: %s | Subject: %s", sender, subject)

                failed_email = _extract_failed_email(msg)
                if not failed_email:
                    logger.info("Bounce monitor: could not extract failed recipient from NDR, skipping")
                    mail.store(msg_id, '+FLAGS', '\\Seen')
                    continue

                logger.info("Bounce monitor: failed recipient identified as %s", failed_email)
                reason = _extract_reason(msg)

                # Find the most-recent 'sent' log to this address
                log = (
                    db.query(models.EmailLog)
                    .filter(
                        models.EmailLog.to_email.ilike(failed_email),
                        models.EmailLog.status == 'sent',
                    )
                    .order_by(models.EmailLog.sent_at.desc())
                    .first()
                )

                if log:
                    log.status = 'failed'
                    log.remarks = f'Auto-detected bounce: {reason}'
                    db.commit()
                    updated += 1
                    logger.info("Bounce monitor: marked log #%d (%s) as failed", log.id, failed_email)
                else:
                    logger.warning(
                        "Bounce monitor: NDR found for %s but no matching 'sent' record in email_logs "
                        "(email may have already been marked failed, or was never logged as sent)",
                        failed_email,
                    )

                # Mark the NDR as read so we don't reprocess it
                mail.store(msg_id, '+FLAGS', '\\Seen')

            except Exception as exc:
                logger.warning(f"Bounce monitor: error processing message {msg_id}: {exc}")
                continue

        mail.close()
        mail.logout()

    except imaplib.IMAP4.error as exc:
        logger.warning(f"Bounce monitor IMAP error: {exc}")
    except OSError as exc:
        logger.warning(f"Bounce monitor network error: {exc}")
    except Exception as exc:
        logger.warning(f"Bounce monitor unexpected error: {exc}")

    return updated


# ── Debug / manual trigger ───────────────────────────────────────────────────

def check_bounces_debug(db: Session) -> dict:
    """
    Same as check_bounces_once but returns a detailed dict for the debug endpoint.
    Does NOT update the database — read-only diagnostic run.
    """
    settings = crud.get_company_settings(db)
    if not (settings and settings.smtp_user and settings.smtp_password):
        return {"error": "SMTP credentials not configured in Settings."}

    result = {
        "imap_connected": False,
        "messages_found": 0,
        "messages": [],
        "error": None,
    }

    since = (datetime.utcnow() - timedelta(days=7)).strftime('%d-%b-%Y')
    criteria = [
        f'FROM "mailer-daemon@googlemail.com" SINCE {since}',
        f'FROM "mailer-daemon@google.com" SINCE {since}',
        f'FROM "mailer-daemon@gmail.com" SINCE {since}',
        f'FROM "postmaster@google.com" SINCE {since}',
        f'SUBJECT "Delivery Status Notification" SINCE {since}',
        f'SUBJECT "Address not found" SINCE {since}',
        f'SUBJECT "Undelivered Mail" SINCE {since}',
        f'SUBJECT "Mail delivery failed" SINCE {since}',
    ]

    try:
        mail = _IMAP4_SSL_IPv4('imap.gmail.com', 993)
        mail.login(settings.smtp_user, settings.smtp_password)
        mail.select('INBOX')
        result["imap_connected"] = True

        ids: set[bytes] = set()
        criterion_hits = {}
        for criterion in criteria:
            try:
                _, data = mail.search(None, criterion)
                count = len(data[0].split()) if data and data[0] else 0
                criterion_hits[criterion] = count
                if data and data[0]:
                    ids.update(data[0].split())
            except Exception as exc:
                criterion_hits[criterion] = f"ERROR: {exc}"

        result["criterion_hits"] = criterion_hits
        result["messages_found"] = len(ids)

        for msg_id in ids:
            try:
                _, msg_data = mail.fetch(msg_id, '(BODY.PEEK[])')  # PEEK = don't mark as read
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)

                failed_email = _extract_failed_email(msg)
                reason       = _extract_reason(msg) if failed_email else None

                db_log = None
                db_status = "no 'sent' log found for this address"
                if failed_email:
                    db_log = (
                        db.query(models.EmailLog)
                        .filter(
                            models.EmailLog.to_email.ilike(failed_email),
                            models.EmailLog.status == 'sent',
                        )
                        .order_by(models.EmailLog.sent_at.desc())
                        .first()
                    )
                    if db_log:
                        db_status = f"found log #{db_log.id} — would mark as failed"

                # Collect MIME part content types for diagnosis
                mime_parts = [p.get_content_type() for p in msg.walk()]

                result["messages"].append({
                    "msg_id":       msg_id.decode(),
                    "from":         msg.get("From", ""),
                    "subject":      msg.get("Subject", ""),
                    "mime_parts":   mime_parts,
                    "failed_email": failed_email,
                    "reason":       reason,
                    "db_status":    db_status,
                })
            except Exception as exc:
                result["messages"].append({"msg_id": msg_id.decode(), "error": str(exc)})

        mail.close()
        mail.logout()

    except Exception as exc:
        result["error"] = str(exc)

    return result


# ── Background loop ───────────────────────────────────────────────────────────

async def bounce_monitor_loop():
    """Async background task — runs forever, checking every 5 minutes."""
    logger.info("Bounce monitor started (interval: %ds)", _INTERVAL_SECONDS)
    while True:
        try:
            await asyncio.sleep(_INTERVAL_SECONDS)
            db = SessionLocal()
            try:
                n = check_bounces_once(db)
                if n:
                    logger.info("Bounce monitor: auto-updated %d email log(s) to failed", n)
            finally:
                db.close()
        except asyncio.CancelledError:
            logger.info("Bounce monitor stopped")
            break
        except Exception as exc:
            logger.warning("Bounce monitor loop error: %s", exc)
