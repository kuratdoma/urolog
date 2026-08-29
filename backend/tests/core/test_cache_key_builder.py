"""
Regression test for the fastapi-cache2 key_builder fix.

The library default builds the cache key from str(kwargs), and cached
endpoints take db: AsyncSession = Depends(...). Since AsyncSession has no
custom __repr__, its string form is a unique memory address per request,
so the default key_builder produces a different key on every call —
silently defeating the @cache decorator. cache_key_builder must strip
AsyncSession kwargs so identical logical calls hash to the same key.
"""
from unittest.mock import MagicMock

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache_key_builder import cache_key_builder
from fastapi_cache import default_key_builder


def _fake_func():
    pass


def test_default_key_builder_is_unstable_across_sessions():
    """Establishes the bug this fix addresses: two AsyncSession instances
    produce two different cache keys for an otherwise identical call."""
    session_a = MagicMock(spec=AsyncSession)
    session_b = MagicMock(spec=AsyncSession)

    key_a = default_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session_a, "skip": 0}
    )
    key_b = default_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session_b, "skip": 0}
    )
    assert key_a != key_b


def test_custom_key_builder_is_stable_across_sessions():
    """The actual fix: identical logical calls (same real kwargs, different
    AsyncSession instances) must produce the SAME cache key."""
    session_a = MagicMock(spec=AsyncSession)
    session_b = MagicMock(spec=AsyncSession)

    key_a = cache_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session_a, "skip": 0}
    )
    key_b = cache_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session_b, "skip": 0}
    )
    assert key_a == key_b


def test_custom_key_builder_still_differentiates_real_arguments():
    """Sanity check: the fix must not collapse genuinely different calls
    into the same key — only the AsyncSession kwarg should be ignored."""
    session = MagicMock(spec=AsyncSession)

    key_skip0 = cache_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session, "skip": 0}
    )
    key_skip50 = cache_key_builder(
        _fake_func, namespace="ns", args=(), kwargs={"db": session, "skip": 50}
    )
    assert key_skip0 != key_skip50
