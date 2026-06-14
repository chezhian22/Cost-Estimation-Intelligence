"""
Database schema validator — runs once at application startup.

Compares the live database structure against every table and column the
SQLAlchemy models declare.  If anything critical is missing the app raises
RuntimeError with a plain-English report so the operator knows exactly what
changed and what to fix, instead of seeing a cryptic SQLAlchemy traceback
mid-request.
"""

import logging
import sys
from dataclasses import dataclass, field
from typing import List

from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase

log = logging.getLogger(__name__)


@dataclass
class _Issue:
    level: str        # "ERROR" | "WARN"
    message: str


def validate_db_schema(engine: Engine, base: type) -> None:
    """
    Validate connection and schema on startup.

    Checks performed
    ----------------
    1. The database is reachable (basic SELECT 1).
    2. Every table declared in ``base.metadata`` exists in the live DB.
    3. Every column in those tables exists in the live DB.
       - NOT NULL columns with no default → ERROR  (app will crash on insert)
       - Nullable / defaulted columns      → WARN   (app degrades gracefully)

    Extra columns or tables in the DB are silently ignored (backwards-compat).

    Raises
    ------
    RuntimeError with a formatted report if any ERROR-level issues are found.
    WARN-level issues are printed to stderr and logged but do not block startup.
    """

    # ── 1. Connection check ───────────────────────────────────────────────────
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception as exc:
        _abort(
            "Cannot connect to the database.",
            [
                "• Verify DATABASE_URL is correct.",
                "• Make sure the database server is running.",
                "• Check firewall / network access.",
                f"• Driver error: {exc}",
            ],
        )

    # ── 2. Table + column inspection ─────────────────────────────────────────
    insp = inspect(engine)
    actual_tables: set[str] = set(insp.get_table_names())

    issues: List[_Issue] = []

    for table in base.metadata.sorted_tables:
        tname = table.name

        if tname not in actual_tables:
            issues.append(_Issue("ERROR", f"Table '{tname}' does not exist in the database."))
            continue  # can't inspect columns of a missing table

        actual_cols: set[str] = {c["name"] for c in insp.get_columns(tname)}

        for col in table.columns:
            if col.name in actual_cols:
                continue

            # Decide severity: if the column is NOT NULL and has no default,
            # any INSERT/SELECT will blow up → ERROR.
            # Nullable or server-defaulted columns → WARN (query may degrade).
            critical = (not col.nullable) and (
                col.default is None and col.server_default is None
            )
            level = "ERROR" if critical else "WARN"
            issues.append(
                _Issue(
                    level,
                    f"Column '{tname}.{col.name}' is missing "
                    f"(nullable={col.nullable}).",
                )
            )

    # ── 3. Report ─────────────────────────────────────────────────────────────
    errors = [i for i in issues if i.level == "ERROR"]
    warnings = [i for i in issues if i.level == "WARN"]

    checked = len(base.metadata.sorted_tables)

    if not issues:
        log.info("DB schema OK — %d tables verified.", checked)
        return

    if warnings:
        lines = "\n".join(f"  ⚠  {w.message}" for w in warnings)
        msg = f"Database schema warnings ({len(warnings)} non-critical):\n{lines}"
        log.warning(msg)
        print(f"\n{msg}\n", file=sys.stderr)

    if errors:
        _abort(
            f"Database schema mismatch — {len(errors)} critical issue(s) found.",
            [f"  ✗  {e.message}" for e in errors],
            hints=[
                "The live database structure does not match what this application expects.",
                "Possible causes:",
                "  • The schema was changed in the third-party database.",
                "  • You are connected to a different / wrong database.",
                "  • A required migration script has not been run.",
                "Fix: restore the missing tables/columns or re-run the migration,",
                "     then restart the application.",
            ],
        )


# ── helpers ───────────────────────────────────────────────────────────────────

def _abort(headline: str, details: List[str], hints: List[str] = None) -> None:
    sep = "=" * 62
    lines = [
        "",
        sep,
        f"  STARTUP FAILURE — {headline}",
        sep,
        *details,
    ]
    if hints:
        lines += ["", *hints]
    lines += [sep, ""]
    report = "\n".join(lines)
    print(report, file=sys.stderr)
    raise RuntimeError(report)
