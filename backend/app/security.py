"""
SQL injection detection and input sanitisation.

Why two layers?
---------------
Layer 1 — SQLAlchemy ORM (always active): every value passed via .filter(),
  .add(), etc. is automatically parameterised.  A direct DB injection through
  ORM is essentially impossible.

Layer 2 — This module (defence in depth):
  • Detects known injection patterns in incoming JSON strings.
  • Rejects the request with HTTP 400 before it touches any application logic.
  • Logs the attempt so attacks are visible in server logs even when harmless.
  • Sanitises strings (null bytes, ASCII control chars) that could corrupt
    stored data or confuse downstream rendering.

    
Pattern philosophy: target *sequences* that are injection-specific (a quote
followed by a comment marker, UNION SELECT, stacked statements, etc.) rather
than individual keywords.  This avoids false positives on legitimate business
names such as "SELECT Beverages Ltd" or "Cast Iron Works".
"""

import json
import logging
import re
from typing import Any

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Detection patterns — ordered from most to least specific
# ---------------------------------------------------------------------------
_PATTERNS: list[tuple[re.Pattern, str]] = [
    # Quote + comment → classic ' -- or '; injection
    (re.compile(r"'[\s]*(--|;|/\*)", re.I), "quote-comment sequence"),
    # UNION-based extraction
    (re.compile(r"\bUNION\b[\s]+\bSELECT\b", re.I), "UNION SELECT"),
    # Boolean tautologies:  ' OR 'x'='x  /  ' OR 1=1
    (re.compile(r"'\s*OR\s+('?\w+'?\s*=\s*'?\w+'?|\d+\s*=\s*\d+)", re.I), "OR tautology"),
    (re.compile(r"'\s*AND\s+('?\w+'?\s*=\s*'?\w+'?|\d+\s*=\s*\d+)", re.I), "AND tautology"),
    # Stacked / terminated statements: ; DROP TABLE ...
    (re.compile(r";\s*(DROP|CREATE|ALTER|TRUNCATE|DELETE|INSERT|UPDATE)\b", re.I), "stacked statement"),
    # Block comments used to bypass keyword filters: SE/**/LECT
    (re.compile(r"/\*.*?\*/", re.I | re.S), "block comment"),
    # SQL Server stored procedures (xp_cmdshell, xp_loginconfig, ...)
    (re.compile(r"\bxp_\w+", re.I), "SQL Server xp_ procedure"),
    # EXEC / EXECUTE procedure calls
    (re.compile(r"\bEXEC(UTE)?\s*\(", re.I), "EXEC() call"),
    # Schema enumeration
    (re.compile(r"\bINFORMATION_SCHEMA\b", re.I), "INFORMATION_SCHEMA reference"),
    # Hex-encoded payload: 0x414243
    (re.compile(r"\b0x[0-9a-f]{4,}\b", re.I), "hex-encoded payload"),
    # Trailing line comment  --
    (re.compile(r"--\s*$", re.M), "trailing SQL comment"),
    # SLEEP / BENCHMARK (time-based blind injection)
    (re.compile(r"\b(SLEEP|BENCHMARK|WAITFOR\s+DELAY)\s*\(", re.I), "time-based blind injection"),
    # LOAD_FILE / INTO OUTFILE (file-read/write)
    (re.compile(r"\b(LOAD_FILE|INTO\s+OUTFILE|INTO\s+DUMPFILE)\b", re.I), "file operation"),
]

# Characters that have no place in any user-supplied string field
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def scan_value(value: str) -> list[str]:
    """
    Return the list of pattern names found in *value*.
    Empty list means the string is clean.
    """
    hits: list[str] = []
    for pattern, name in _PATTERNS:
        if pattern.search(value):
            hits.append(name)
    return hits


def sanitise_str(value: str) -> str:
    """
    Strip null bytes and ASCII control characters from *value*.
    Whitespace (\\t, \\n, \\r) is preserved so multi-line inputs work.
    """
    return _CONTROL_CHARS_RE.sub("", value)


def scan_json(obj: Any, _path: str = "") -> list[tuple[str, str]]:
    """
    Walk a decoded JSON object (dict / list / scalar) and return every
    (json_path, pattern_name) pair where an injection pattern was found.
    """
    findings: list[tuple[str, str]] = []

    if isinstance(obj, dict):
        for key, val in obj.items():
            findings.extend(scan_json(val, f"{_path}.{key}" if _path else key))
    elif isinstance(obj, list):
        for i, item in enumerate(obj):
            findings.extend(scan_json(item, f"{_path}[{i}]"))
    elif isinstance(obj, str):
        for hit in scan_value(obj):
            findings.append((_path, hit))

    return findings


def check_request_body(raw_body: bytes, client_ip: str, path: str) -> list[tuple[str, str]]:
    """
    Parse *raw_body* as JSON and scan every string value.

    Returns the list of findings.  If non-empty, the caller should reject
    the request.  Regardless, findings are logged at WARNING level.
    """
    if not raw_body:
        return []

    try:
        obj = json.loads(raw_body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return []

    findings = scan_json(obj)
    if findings:
        detail = "; ".join(f"field={f} pattern={p}" for f, p in findings)
        log.warning(
            "SQL injection attempt detected — ip=%s path=%s details=[%s]",
            client_ip,
            path,
            detail,
        )
    return findings
