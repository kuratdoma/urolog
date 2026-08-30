"""
Regression tests for e-posta VEYA kullanıcı adı ile giriş.

Login artık OAuth2PasswordRequestForm'un `username` alanını bir "identifier"
olarak yorumluyor: hem e-posta hem kullanıcı adı eşleşebiliyor ve eşleşme
büyük/küçük harf duyarsız. Bu davranış kimlik doğrulama yüzeyinin parçası
olduğu için burada kilitleniyor.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi import HTTPException
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.api import deps
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService


class _FakeUser:
    id = 7
    email = "Doktor@Klinik.com"
    username = "DrAlp"
    full_name = "Dr Alp"
    role = "ADMIN"
    clinic_id = "default"
    is_superuser = False
    is_active = True
    hashed_password = "hashed"


def _repo_with_execute_capture(returned_user):
    """UserRepository'yi sahte bir AsyncSession ile kurar, çalıştırılan
    statement'ı yakalar (SQL'i derleyip iddia edebilmek için)."""
    captured = {}

    async def _execute(stmt):
        captured["stmt"] = stmt
        result = MagicMock()
        result.scalars.return_value.first.return_value = returned_user
        return result

    db = MagicMock()
    db.execute = AsyncMock(side_effect=_execute)
    return UserRepository(db), db, captured


# --- Repository katmanı ---------------------------------------------------

@pytest.mark.asyncio
async def test_lookup_matches_either_email_or_username_case_insensitively():
    repo, _db, captured = _repo_with_execute_capture(_FakeUser())

    user = await repo.get_by_email_or_username("  DOKTOR@klinik.COM  ")

    assert user is not None
    sql = str(captured["stmt"].compile(compile_kwargs={"literal_binds": True}))
    # Her iki sütun da lower() ile ve OR'lanmış olarak sorgulanmalı.
    assert "lower(users.email)" in sql
    assert "lower(users.username)" in sql
    assert " OR " in sql
    # Identifier trim + lowercase edilmiş olarak bind edilmeli.
    assert "'doktor@klinik.com'" in sql


@pytest.mark.asyncio
async def test_lookup_is_deterministic_when_rows_differ_only_by_case():
    """lower() eşleşmesi birden fazla satır döndürebilir (sütun unique kısıtları
    harfe duyarlı). order_by(users.id) hangi satırın döneceğini sabitler."""
    repo, _db, captured = _repo_with_execute_capture(_FakeUser())

    await repo.get_by_email_or_username("dralp")

    sql = str(captured["stmt"].compile(compile_kwargs={"literal_binds": True}))
    assert "ORDER BY users.id" in sql


@pytest.mark.asyncio
@pytest.mark.parametrize("identifier", ["", "   "])
async def test_blank_identifier_short_circuits_without_touching_db(identifier):
    repo, db, _captured = _repo_with_execute_capture(_FakeUser())

    assert await repo.get_by_email_or_username(identifier) is None
    assert await repo.get_by_email(identifier) is None
    assert await repo.get_by_username(identifier) is None
    db.execute.assert_not_awaited()


# --- Service katmanı ------------------------------------------------------

@pytest.mark.asyncio
async def test_authenticate_returns_user_id_for_audit_without_second_query():
    """Endpoint audit kaydı için user_id'yi bu dict'ten okur; kullanıcıyı
    tekrar sorgulamaması gerekir."""
    repo = MagicMock()
    repo.get_by_email_or_username = AsyncMock(return_value=_FakeUser())
    service = AuthService(repo)

    with patch("app.core.security.verify_password", return_value=True):
        result = await service.authenticate_user("DrAlp", "sifre")

    assert result["user_id"] == _FakeUser.id
    assert result["token_type"] == "bearer"
    repo.get_by_email_or_username.assert_awaited_once_with("DrAlp")


@pytest.mark.asyncio
async def test_authenticate_rejects_wrong_password_with_generic_message():
    """Hata mesajı kullanıcının var olup olmadığını sızdırmamalı."""
    repo = MagicMock()
    repo.get_by_email_or_username = AsyncMock(return_value=_FakeUser())
    service = AuthService(repo)

    with patch("app.core.security.verify_password", return_value=False):
        with pytest.raises(HTTPException) as exc:
            await service.authenticate_user("DrAlp", "yanlis")

    assert exc.value.status_code == 401
    assert exc.value.detail == "Email veya şifre hatalı"


@pytest.mark.asyncio
async def test_authenticate_rejects_unknown_identifier_with_same_message():
    repo = MagicMock()
    repo.get_by_email_or_username = AsyncMock(return_value=None)
    service = AuthService(repo)

    with pytest.raises(HTTPException) as exc:
        await service.authenticate_user("yok@yok.com", "sifre")

    # Bilinmeyen kullanıcı ile yanlış şifre ayırt edilememeli (user enumeration).
    assert exc.value.status_code == 401
    assert exc.value.detail == "Email veya şifre hatalı"


# --- Endpoint katmanı -----------------------------------------------------

@pytest.mark.asyncio
async def test_login_accepts_username_in_the_oauth_username_field():
    """OAuth2 formunun `username` alanı bir kullanıcı adı taşıdığında da
    giriş başarılı olmalı (eskiden yalnızca e-posta kabul ediliyordu)."""
    async def _get_db():
        db = AsyncMock()
        db.execute = AsyncMock(return_value=MagicMock())
        yield db

    app.dependency_overrides[deps.get_db] = _get_db
    fake_result = {
        "access_token": "access",
        "refresh_token": "refresh",
        "token_type": "bearer",
        "user_id": _FakeUser.id,
    }
    try:
        with patch(
            "app.services.auth_service.AuthService.authenticate_user",
            new=AsyncMock(return_value=fake_result),
        ) as auth_mock, patch(
            "app.services.audit_service.AuditService.log", new=AsyncMock()
        ) as audit_mock:
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                response = await ac.post(
                    "/api/v1/auth/login",
                    data={"username": "  DrAlp  ", "password": "sifre"},
                )

        assert response.status_code == 200
        assert response.json()["access_token"] == "access"
        # Endpoint identifier'ı trim ederek servise geçirmeli.
        auth_mock.assert_awaited_once_with("DrAlp", "sifre")
        # Audit kaydı servisten gelen user_id ile yazılmalı.
        assert audit_mock.await_args.kwargs["user_id"] == _FakeUser.id
    finally:
        app.dependency_overrides.pop(deps.get_db, None)
