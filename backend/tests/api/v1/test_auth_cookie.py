"""
Regression tests for the httpOnly refresh-token cookie migration.

Refresh token must never appear in a JSON response body (login, refresh)
and must be readable only from the httpOnly cookie set on /api/v1/auth/*.
Access token stays in the JSON body (in-memory on the frontend) —
unaffected by this migration, per the approved hybrid-scope plan.
"""
import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.api import deps
from app.core.security import create_refresh_token


class _FakeUser:
    id = 42
    email = "test@example.com"
    username = "testuser"
    full_name = "Test User"
    role = "ADMIN"
    clinic_id = "default"
    is_superuser = True
    is_active = True


def _db_override_returning(user_or_none):
    async def _get_db():
        db = AsyncMock()
        result = MagicMock()
        result.scalars.return_value.first.return_value = user_or_none
        db.execute = AsyncMock(return_value=result)
        yield db
    return _get_db


@pytest.mark.asyncio
async def test_login_sets_httponly_refresh_cookie_not_in_body():
    app.dependency_overrides[deps.get_db] = _db_override_returning(None)
    fake_result = {
        "access_token": "fake-access-token",
        "refresh_token": "fake-refresh-token",
        "token_type": "bearer",
    }
    try:
        with patch(
            "app.services.auth_service.AuthService.authenticate_user",
            new=AsyncMock(return_value=fake_result),
        ):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/v1/auth/login",
                    data={"username": "test@example.com", "password": "irrelevant"},
                )

        assert response.status_code == 200
        body = response.json()
        assert "refresh_token" not in body
        assert body["access_token"] == "fake-access-token"

        set_cookie = response.headers.get("set-cookie", "")
        assert "refresh_token=fake-refresh-token" in set_cookie
        assert "HttpOnly" in set_cookie
        assert "Path=/api/v1/auth" in set_cookie
    finally:
        app.dependency_overrides.pop(deps.get_db, None)


@pytest.mark.asyncio
async def test_refresh_reads_cookie_not_body_and_rotates_it():
    fake_user = _FakeUser()
    app.dependency_overrides[deps.get_db] = _db_override_returning(fake_user)
    try:
        refresh_token = create_refresh_token(
            fake_user.id,
            name=fake_user.full_name,
            username=fake_user.username,
            email=fake_user.email,
            role=fake_user.role,
            clinic_id=fake_user.clinic_id,
            is_superuser=fake_user.is_superuser,
        )

        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport, base_url="http://test",
            cookies={"refresh_token": refresh_token},
        ) as ac:
            response = await ac.post("/api/v1/auth/refresh")

        assert response.status_code == 200
        body = response.json()
        assert "refresh_token" not in body
        assert "access_token" in body

        set_cookie = response.headers.get("set-cookie", "")
        assert "refresh_token=" in set_cookie
        assert "HttpOnly" in set_cookie
    finally:
        app.dependency_overrides.pop(deps.get_db, None)


@pytest.mark.asyncio
async def test_refresh_without_cookie_returns_401():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post("/api/v1/auth/refresh")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_logout_clears_refresh_cookie():
    fake_user = _FakeUser()
    app.dependency_overrides[deps.get_db] = _db_override_returning(fake_user)
    app.dependency_overrides[deps.get_current_user] = lambda: fake_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            response = await ac.post("/api/v1/auth/logout")

        assert response.status_code == 200
        set_cookie = response.headers.get("set-cookie", "")
        assert "refresh_token=" in set_cookie
        assert ("Max-Age=0" in set_cookie) or ("expires=" in set_cookie.lower())
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
        app.dependency_overrides.pop(deps.get_current_user, None)
