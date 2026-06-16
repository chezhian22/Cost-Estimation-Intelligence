"""Background task: poll Gmail inbox for bounce/NDR emails and auto-update email_logs."""

import asyncio
import email as email_lib
import imaplib
import logging
import re

from sqlalchemy.orm import Session

from . import crud, models
from .database import SessionLocal

logger = logging.getLogger(__name__)

_INTERVAL_SECONDS = 300  # check every 5 minutes


# ── NDR parsing ───────────────────────────────────────────────────────────────

def _extract_failed_email(msg) -> str | None:
    """Return the failed recipient from a bounce message, or None if unparseable."""
    # Primary: machine-readable delivery-status part (most reliable)
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

    # Fallback: scan text/plain parts for Gmail's human-readable wording
    for part in msg.walk():
        if part.get_content_type() != 'text/plain':
            continue
        try:
            text = part.get_payload(decode=True).decode('utf-8', errors='replace')
        except Exception:
            continue
        for pattern in [
            r"Your message to\s+([^\s<>]+@[^\s<>]+)\s+couldn't be delivered",
            r"([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\s+does not exist",
            r"The email account that you tried to reach (?:does not exist|is disabled)",
        ]:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match and '@' in match.group(0):
                # pull the email out of the full match
                email_match = re.search(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}', match.group(0))
                if email_match:
                    return email_match.group(0).lower()

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
        mail = imaplib.IMAP4_SSL('imap.gmail.com', 993)
        mail.login(settings.smtp_user, settings.smtp_password)
        mail.select('INBOX')

        # Two searches cover Gmail's mailer-daemon and postmaster addresses
        ids: set[bytes] = set()
        for criterion in [
            '(UNSEEN FROM "mailer-daemon@googlemail.com")',
            '(UNSEEN FROM "postmaster@google.com")',
            '(UNSEEN SUBJECT "Delivery Status Notification")',
            '(UNSEEN SUBJECT "Address not found")',
        ]:
            try:
                _, data = mail.search(None, criterion)
                if data and data[0]:
                    ids.update(data[0].split())
            except Exception:
                pass

        for msg_id in ids:
            try:
                _, msg_data = mail.fetch(msg_id, '(RFC822)')
                raw = msg_data[0][1]
                msg = email_lib.message_from_bytes(raw)

                failed_email = _extract_failed_email(msg)
                if not failed_email:
                    mail.store(msg_id, '+FLAGS', '\\Seen')
                    continue

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
                    logger.info(f"Bounce monitor: marked log #{log.id} ({failed_email}) as failed")

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
