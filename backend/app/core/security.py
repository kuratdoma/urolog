import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Union
import base64
import hashlib
from jose import jwt
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _get_fernet() -> Fernet:
    """Derive a 32-byte URL-safe base64 key from settings.SECRET_KEY"""
    key_bytes = settings.SECRET_KEY.encode('utf-8')
    hash_key = hashlib.sha256(key_bytes).digest()
    fernet_key = base64.urlsafe_b64encode(hash_key)
    return Fernet(fernet_key)


def encrypt_value(value: str) -> str:
    """Encrypt a string value using symmetric encryption (Fernet)"""
    if not value or value == "••••••••••••••••":
        return value
    try:
        f = _get_fernet()
        return f.encrypt(value.encode('utf-8')).decode('utf-8')
    except Exception:
        return value


def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a string value using symmetric encryption (Fernet)"""
    if not encrypted_value or encrypted_value == "••••••••••••••••":
        return encrypted_value
    try:
        f = _get_fernet()
        return f.decrypt(encrypted_value.encode('utf-8')).decode('utf-8')
    except Exception:
        # Fallback to plain text if decryption fails
        return encrypted_value



def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: Union[str, Any], name: str = None, **kwargs) -> str:
    # SEC-18: timezone-aware UTC kullanımı (Python 3.12+ uyumlu)
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    if name:
        to_encode["name"] = name
    to_encode.update(kwargs)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, Any], name: str = None, **kwargs) -> str:
    # SEC-18: timezone-aware UTC kullanımı (Python 3.12+ uyumlu)
    now = datetime.now(timezone.utc)
    expire = now + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": "refresh",
        "jti": str(uuid.uuid4()),  # Unique token ID for rotation tracking
        "iat": int(now.timestamp()),  # Issued-at for revocation checks
    }
    if name:
        to_encode["name"] = name
    to_encode.update(kwargs)
    return jwt.encode(to_encode, settings.REFRESH_SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> dict:
    """
    Decode and validate a refresh token.

    Returns:
        The token payload dict if valid.

    Raises:
        JWTError: If token is invalid or expired.
        ValueError: If token type is not 'refresh'.
    """
    payload = jwt.decode(
        token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM]
    )
    if payload.get("type") != "refresh":
        raise ValueError("Invalid token type: expected 'refresh'")
    return payload
