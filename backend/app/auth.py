"""JWT + password-hashing utilities."""

import base64
import hashlib
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt

SECRET_KEY = os.getenv("SECRET_KEY", "chroma-print-secret-key-2024")
ALGORITHM  = "HS256"
TOKEN_EXPIRE_HOURS = 8

# Fernet key derived from SECRET_KEY — used to encrypt SMTP passwords at rest
_fernet = Fernet(base64.urlsafe_b64encode(hashlib.sha256(SECRET_KEY.encode()).digest()))


def encrypt_smtp_password(plain: str) -> str:
    return _fernet.encrypt(plain.encode()).decode()


def decrypt_smtp_password(stored: str) -> str:
    """Decrypt a Fernet-encrypted SMTP password. Falls back to plaintext for legacy values."""
    if not stored:
        return stored
    try:
        return _fernet.decrypt(stored.encode()).decode()
    except (InvalidToken, Exception):
        return stored


def _prepare(plain: str) -> bytes:
    """SHA-256 pre-hash → 43-byte base64 string, always under bcrypt's 72-byte limit."""
    digest = hashlib.sha256(plain.encode("utf-8")).digest()
    return base64.b64encode(digest)


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_prepare(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(_prepare(plain), hashed.encode("utf-8"))


def create_access_token(user_id: int, username: str, role: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "username": username, "role": role, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
