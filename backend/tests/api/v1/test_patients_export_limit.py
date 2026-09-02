"""
Regression test: GET /patients/advanced-search/export must reject an
over-broad (or empty) filter that would export an unbounded number of
rows, instead of streaming the entire patient table.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock

from app.main import app
from app.api import deps
from app.core.permissions import UserRole
from app.api.v1.endpoints.patients import EXPORT_MAX_ROWS


class _FakeUser:
    id = 1
    username = "tester"
    # RBAC kapısı rolü okuyor; gerçek User daima bir role taşır.
    role = UserRole.ADMIN


def _override_current_user():
    return _FakeUser()


@pytest.mark.asyncio
async def test_export_rejects_result_set_over_max_rows():
    fake_db = AsyncMock()
    fake_db.scalar = AsyncMock(return_value=EXPORT_MAX_ROWS + 1)

    async def _override_get_db():
        yield fake_db

    app.dependency_overrides[deps.get_db] = _override_get_db
    app.dependency_overrides[deps.get_current_user] = _override_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/patients/advanced-search/export")

        assert response.status_code == 400
        assert str(EXPORT_MAX_ROWS) in response.json()["detail"]
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_user, None)


@pytest.mark.asyncio
async def test_export_allows_result_set_under_max_rows():
    fake_db = AsyncMock()
    fake_db.scalar = AsyncMock(return_value=5)

    async def _override_get_db():
        yield fake_db

    app.dependency_overrides[deps.get_db] = _override_get_db
    app.dependency_overrides[deps.get_current_user] = _override_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.get("/api/v1/patients/advanced-search/export")

        # Not rejected by the row-count guard — status depends on the rest
        # of the (mocked) DB flow, but it must not be our 400 guard.
        assert response.status_code != 400 or str(EXPORT_MAX_ROWS) not in response.text
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_user, None)
