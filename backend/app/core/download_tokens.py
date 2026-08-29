"""
SEC-WARN-04: Redis-backed single-use download tokens.
Replaces the in-memory dict implementation that failed with Gunicorn multi-worker.

Uses Redis SET with automatic TTL expiry (no manual cleanup needed).
Falls back to in-memory storage if Redis is unavailable.
"""
import json
import secrets
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)

TOKEN_EXPIRY_SECONDS = 60  # 1 dakika

# In-memory fallback (only used when Redis is unavailable)
_fallback_tokens: dict[str, dict] = {}


async def _get_redis():
    """Get Redis instance from FastAPI app state."""
    try:
        from app.main import app
        redis = getattr(app.state, "redis", None)
        return redis
    except Exception:
        return None


def create_download_token(user_id: int, resource_type: str, resource_id: str) -> str:
    """Tek kullanımlık download token oluştur."""
    token = secrets.token_urlsafe(32)

    # Store in fallback dict synchronously (will be validated async)
    _fallback_tokens[token] = {
        "user_id": user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "created_at": time.time(),
    }

    # Cleanup old fallback tokens
    _cleanup_expired()

    return token


async def store_token_in_redis(token: str, user_id: int, resource_type: str, resource_id: str) -> bool:
    """Store a download token in Redis. Call this after creating the token."""
    redis = await _get_redis()
    if not redis:
        return False

    key = f"dl:{token}"
    data = json.dumps({
        "user_id": user_id,
        "resource_type": resource_type,
        "resource_id": resource_id,
    })
    await redis.setex(key, TOKEN_EXPIRY_SECONDS, data)
    # Remove from fallback since Redis has it
    _fallback_tokens.pop(token, None)
    return True


async def validate_download_token_async(token: str, resource_type: str, resource_id: str) -> Optional[int]:
    """
    Validate and consume a download token (Redis-first, fallback to in-memory).
    Returns user_id if valid, None otherwise. Token is consumed (single-use).
    """
    redis = await _get_redis()

    # Try Redis first (works across all Gunicorn workers)
    if redis:
        key = f"dl:{token}"
        data_raw = await redis.get(key)
        if data_raw:
            await redis.delete(key)  # Single-use: delete immediately
            data = json.loads(data_raw)
            if data["resource_type"] == resource_type and data["resource_id"] == resource_id:
                return data["user_id"]
            return None

    # Fallback to in-memory (development / Redis-down scenario)
    return validate_download_token(token, resource_type, resource_id)


def validate_download_token(token: str, resource_type: str, resource_id: str) -> Optional[int]:
    """Token'ı doğrula ve tek kullanımlık olarak sil. User ID döner veya None."""
    data = _fallback_tokens.pop(token, None)
    if not data:
        return None
    if time.time() - data["created_at"] > TOKEN_EXPIRY_SECONDS:
        return None
    if data["resource_type"] != resource_type or data["resource_id"] != resource_id:
        return None
    return data["user_id"]


def _cleanup_expired():
    """Süresi dolmuş token'ları temizle."""
    now = time.time()
    expired = [k for k, v in _fallback_tokens.items() if now - v["created_at"] > TOKEN_EXPIRY_SECONDS * 2]
    for k in expired:
        _fallback_tokens.pop(k, None)
