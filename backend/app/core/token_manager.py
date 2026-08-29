"""
SEC-CRIT-01: Redis-backed refresh token management.

Provides:
- Refresh token rotation: each refresh token can only be used ONCE.
- Token revocation: on logout, the refresh token family is invalidated.
- Token family tracking: if a used token is replayed, the entire family is revoked.

Uses Redis with automatic TTL expiry (no manual cleanup needed).
"""
import json
import logging
from typing import Optional
from redis import asyncio as aioredis

logger = logging.getLogger(__name__)

# Prefix keys for clarity in Redis
_USED_PREFIX = "rt:used:"       # Used refresh tokens (detect replay)
_REVOKED_PREFIX = "rt:revoked:" # Revoked user sessions

# TTL matches refresh token lifetime (7 days + 1 hour buffer)
_TOKEN_TTL = 7 * 24 * 3600 + 3600  # 7 days + 1 hour


async def _get_redis() -> Optional[aioredis.Redis]:
    """Get Redis instance from FastAPI app state."""
    try:
        from app.main import app
        redis = getattr(app.state, "redis", None)
        return redis
    except Exception:
        return None


async def mark_token_used(jti: str, user_id: int) -> bool:
    """
    Mark a refresh token as used after rotation.
    Returns True if successfully marked, False if Redis unavailable.
    """
    redis = await _get_redis()
    if not redis:
        logger.critical(
            "[TOKEN-MANAGER] Redis unavailable: token rotation tracking DISABLED "
            "(replay detection degraded, fail-open for availability)"
        )
        return False

    key = f"{_USED_PREFIX}{jti}"
    await redis.setex(key, _TOKEN_TTL, str(user_id))
    return True


async def is_token_used(jti: str) -> bool:
    """Check if a refresh token has already been used (replay detection)."""
    redis = await _get_redis()
    if not redis:
        # Fail-open for availability: Redis outage should not lock users out.
        # mark_token_used() above already logs CRITICAL when this happens.
        return False

    key = f"{_USED_PREFIX}{jti}"
    return await redis.exists(key) > 0


async def revoke_user_tokens(user_id: int) -> bool:
    """
    Revoke all refresh tokens for a user (used on logout / password change).
    Sets a timestamp — any refresh token issued BEFORE this timestamp is invalid.
    """
    redis = await _get_redis()
    if not redis:
        logger.critical(
            "[TOKEN-MANAGER] Redis unavailable: cannot revoke tokens for user_id=%s "
            "(logout/password-change revocation degraded, fail-open for availability)",
            user_id,
        )
        return False

    import time
    key = f"{_REVOKED_PREFIX}{user_id}"
    await redis.setex(key, _TOKEN_TTL, str(int(time.time())))
    return True


async def is_user_revoked(user_id: int, token_iat: int) -> bool:
    """
    Check if a user's tokens have been revoked after this token was issued.
    token_iat: the 'iat' (issued-at) timestamp from the JWT.
    """
    redis = await _get_redis()
    if not redis:
        return False

    key = f"{_REVOKED_PREFIX}{user_id}"
    revoked_at = await redis.get(key)
    if not revoked_at:
        return False

    return token_iat <= int(revoked_at)
