"""
Tests for the startup schema validator.
These use the real SQLite test engine — no mocking of the DB layer.
"""
import pytest
from unittest.mock import patch, MagicMock
from sqlalchemy import Column, Integer, String, create_engine, MetaData, Table
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import StaticPool

from app.schema_validator import validate_db_schema


# ── helpers ───────────────────────────────────────────────────────────────────

def _memory_engine():
    return create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


class _Base(DeclarativeBase):
    pass


# ── connection check ──────────────────────────────────────────────────────────

def test_bad_connection_raises_runtime_error():
    bad_engine = create_engine("sqlite:////nonexistent/path/db.sqlite")
    with pytest.raises(RuntimeError, match="Cannot connect"):
        validate_db_schema(bad_engine, _Base)


# ── missing table ─────────────────────────────────────────────────────────────

def test_missing_table_raises_runtime_error():
    class Base2(DeclarativeBase):
        pass

    class MyModel(Base2):
        __tablename__ = "ghost_table"
        id = Column(Integer, primary_key=True)
        name = Column(String(50), nullable=False)

    engine = _memory_engine()
    # Don't create the table — leave DB empty
    with pytest.raises(RuntimeError, match="ghost_table"):
        validate_db_schema(engine, Base2)


def test_error_message_names_missing_table():
    class Base3(DeclarativeBase):
        pass

    class M(Base3):
        __tablename__ = "missing_one"
        id = Column(Integer, primary_key=True)

    engine = _memory_engine()
    with pytest.raises(RuntimeError) as exc_info:
        validate_db_schema(engine, Base3)
    assert "missing_one" in str(exc_info.value)


# ── missing column ────────────────────────────────────────────────────────────

def test_missing_nonnull_column_raises_runtime_error():
    class Base4(DeclarativeBase):
        pass

    class M(Base4):
        __tablename__ = "products"
        id   = Column(Integer, primary_key=True)
        name = Column(String(80), nullable=False)  # will be missing

    engine = _memory_engine()
    # Create the table with only `id` — no `name` column
    with engine.begin() as conn:
        conn.execute(__import__("sqlalchemy").text(
            "CREATE TABLE products (id INTEGER PRIMARY KEY)"
        ))

    with pytest.raises(RuntimeError, match="products.name"):
        validate_db_schema(engine, Base4)


def test_missing_nullable_column_does_not_raise(capsys):
    """Nullable missing columns emit a warning but must not abort startup."""
    class Base5(DeclarativeBase):
        pass

    class M(Base5):
        __tablename__ = "items"
        id    = Column(Integer, primary_key=True)
        notes = Column(String(200), nullable=True)   # missing but nullable → WARN only

    engine = _memory_engine()
    with engine.begin() as conn:
        conn.execute(__import__("sqlalchemy").text(
            "CREATE TABLE items (id INTEGER PRIMARY KEY)"
        ))

    # Should NOT raise
    validate_db_schema(engine, Base5)

    # Warning should appear on stderr
    captured = capsys.readouterr()
    assert "notes" in captured.err
    assert "WARN" in captured.err or "warning" in captured.err.lower()


# ── happy path ────────────────────────────────────────────────────────────────

def test_valid_schema_passes_silently():
    class Base6(DeclarativeBase):
        pass

    class M(Base6):
        __tablename__ = "widgets"
        id    = Column(Integer, primary_key=True)
        label = Column(String(50), nullable=False)

    engine = _memory_engine()
    Base6.metadata.create_all(engine)

    # Must not raise
    validate_db_schema(engine, Base6)


def test_extra_db_columns_are_ignored():
    """The DB may have extra columns added externally — that should be fine."""
    class Base7(DeclarativeBase):
        pass

    class M(Base7):
        __tablename__ = "extras"
        id = Column(Integer, primary_key=True)

    engine = _memory_engine()
    # Create table with MORE columns than the model expects
    with engine.begin() as conn:
        conn.execute(__import__("sqlalchemy").text(
            "CREATE TABLE extras (id INTEGER PRIMARY KEY, extra_col TEXT)"
        ))

    # Should not raise
    validate_db_schema(engine, Base7)


# ── real app schema ───────────────────────────────────────────────────────────

def test_real_app_schema_passes(client):
    """
    The running test DB (SQLite) must pass validation without errors.
    This confirms the validator is wired correctly in main.py.
    """
    from app.database import engine as app_engine
    from app.database import Base as AppBase

    # Should not raise
    validate_db_schema(app_engine, AppBase)
