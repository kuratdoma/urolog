"""
Custom fastapi-cache2 key_builder.

The library default builds the cache key from `str(kwargs)`. Several
cached endpoints in this app take `db: AsyncSession = Depends(...)` as a
parameter — a fresh session object per request with no custom __repr__,
so its string form (`<...AsyncSession object at 0x...>`) is different on
every call. That makes the resulting cache key effectively unique per
request, so the @cache decorator never hits (near-constant cache misses),
silently defeating the caching it was meant to provide.

The same problem hits any `current_user: User = Depends(...)` kwarg (or
any other SQLAlchemy ORM model instance passed as a dependency): with no
custom __repr__, the default object address ends up in the key, so an
endpoint whose response doesn't actually depend on which user calls it
(e.g. dashboard aggregates) still gets a fresh key — and a cache miss —
on every request. Only apply @cache to endpoints whose response does NOT
vary per user; dropping the user kwarg means the cached response is
shared across whoever calls next.

This key_builder drops any kwarg whose value is a SQLAlchemy AsyncSession
or a mapped ORM model instance (or a FastAPI Request/Response, matching
what the library already excludes) before hashing, so identical logical
calls produce identical keys again.
"""
import hashlib
from typing import Any, Callable, Dict, Optional, Tuple

from fastapi import Request, Response
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.exc import NoInspectionAvailable
from sqlalchemy.ext.asyncio import AsyncSession


def _is_unstable_repr(value: Any) -> bool:
    """True for AsyncSession or any mapped SQLAlchemy ORM instance (no stable __repr__)."""
    if isinstance(value, AsyncSession):
        return True
    try:
        sa_inspect(value)
    except NoInspectionAvailable:
        return False
    else:
        return True


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
        k: v for k, v in kwargs.items() if not _is_unstable_repr(v)
    }
    cache_key = hashlib.md5(  # noqa: S324 - cache key, not a security boundary
        f"{func.__module__}:{func.__name__}:{args}:{stable_kwargs}".encode()
    ).hexdigest()
    return f"{namespace}:{cache_key}"
