import os
import uuid

# Must be set BEFORE any app module is imported so database.py picks up SQLite.
_HERE = os.path.dirname(os.path.abspath(__file__))
_DB = os.path.join(_HERE, "test_cylinder.db")

os.environ["DATABASE_URL"] = f"sqlite:///{_DB}"
os.environ.setdefault("SECRET_KEY", "test-secret-key-2024")

# Remove stale DB so every pytest run starts with a clean slate.
if os.path.exists(_DB):
    os.remove(_DB)

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

# Importing app.main triggers Base.metadata.create_all + _migrate + seed_admin
# against the SQLite file we set above.
from app.database import engine
from app.main import app  # noqa: E402
from app import models
from app.auth import create_access_token

_Session = sessionmaker(bind=engine)


def _wipe() -> None:
    """Delete all domain data but keep the seeded admin user."""
    s = _Session()
    try:
        s.query(models.CalculationVersion).delete(synchronize_session=False)
        s.query(models.Calculation).delete(synchronize_session=False)
        s.query(models.Order).delete(synchronize_session=False)
        s.query(models.Client).delete(synchronize_session=False)
        s.query(models.Substrate).delete(synchronize_session=False)
        s.query(models.TeethData).delete(synchronize_session=False)
        s.query(models.CompanySettings).delete(synchronize_session=False)
        s.query(models.User).filter(
            models.User.email != "admin@gmail.com"
        ).delete(synchronize_session=False)
        s.commit()
    finally:
        s.close()


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(scope="session")
def admin_headers() -> dict:
    """JWT bearer headers for the seeded admin (id=1)."""
    token = create_access_token(user_id=1, username="admin", role="admin")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def clean_tables():
    """Isolate each test: wipe domain data before and after."""
    _wipe()
    yield
    _wipe()


def uid() -> str:
    return uuid.uuid4().hex[:6]
