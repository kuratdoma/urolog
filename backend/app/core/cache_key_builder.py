"""
Custom fastapi-cache2 key_builder.

The library default builds the cache key from `str(kwargs)`. Several
cached endpoints in this app take `db: AsyncSession = Depends(...)` as a
parameter — a fresh session object per request with no custom __repr__,
so its string form (`<...AsyncSession object at 0x...>`) is different on
every call. That makes the resulting cache key effectively unique per
request, so the @cache decorator never hits (near-constant cache misses),
silently defeating the caching it was meant to provide.

This key_builder drops any kwarg whose value is a SQLAlchemy AsyncSession
(or a FastAPI Request/Response, matching what the library already
excludes) before hashing, so identical logical calls produce identical
keys again.
"""
import hashlib
from typing import Any, Callable, Dict, Optional, Tuple

from fastapi import Request, Response
from sqlalchemy.ext.asyncio import AsyncSession


def cache_key_builder(
    func: Callable[..., Any],
    namespace: str = "",
    *,
    request: Optional[Request] = None,
    response: Optional[Response] = None,
    args: Tuple[Any, ...],
    kwargs: Dict[str, Any],
) -> str:
    stable_kwargs = {
        k: v for k, v in kwargs.items() if not isinstance(v, AsyncSession)
    }
    cache_key = hashlib.md5(  # noqa: S324 - cache key, not a security boundary
        f"{func.__module__}:{func.__name__}:{args}:{stable_kwargs}".encode()
    ).hexdigest()
    return f"{namespace}:{cache_key}"
