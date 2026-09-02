"""RBAC kapılarının GERÇEKTEN engellediğini doğrular.

Depodaki diğer API testleri oturumu ADMIN/DOCTOR olarak override ediyor; bu
roller PERMISSION_MATRIX'te tam CRUD'a sahip olduğu için kapılar kaldırılsa
bile o testler yeşil kalır. Buradaki testler kapıyı asıl işlevinden — yetkisiz
rolü reddetmekten — sınar.
"""
import asyncio

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import PERMISSION_MATRIX, Action, UserRole, has_permission

client = TestClient(app)


def _as(role: UserRole):
    def _override():
        return User(id=1, username="t", is_active=True, role=role)
    return _override


@pytest.fixture(autouse=True)
def _restore_overrides():
    """Diğer test modülleri get_current_user'ı MODÜL seviyesinde override ediyor;
    pop etmek onları bozar. Önceki değer neyse aynen geri konur."""
    previous = app.dependency_overrides.get(deps.get_current_user)
    yield
    if previous is None:
        app.dependency_overrides.pop(deps.get_current_user, None)
    else:
        app.dependency_overrides[deps.get_current_user] = previous


# (yol, metod, modül, aksiyon) — matriste kısıtlı olan temsili PHI uçları
# Bu turda kapı EKLENEN temsili uçlar. Zaten superuser korumalı uçlar (ör.
# DELETE /patients/{id}) bilerek dışarıda: onlar matristen daha katı bir kapıya
# sahip ve bu testin ölçtüğü şey o değil.
CASES = [
    ("/api/v1/appointments/1", "delete", "appointments", Action.DELETE),
    ("/api/v1/clinical/photos/1", "put", "imaging", Action.UPDATE),
    ("/api/v1/clinical/muayeneler", "post", "clinical", Action.CREATE),
    ("/api/v1/lab/genel/batch", "post", "lab", Action.CREATE),
]


@pytest.mark.parametrize("path,method,module,action", CASES)
@pytest.mark.parametrize("role", [UserRole.TECHNICIAN, UserRole.FRONTDESK, UserRole.NURSE])
def test_unprivileged_roles_are_denied(path, method, module, action, role):
    """Matris o role izin vermiyorsa uç 403 döndürmeli — 200 de 500 de değil."""
    if has_permission(role, module, action):
        pytest.skip(f"{role.value} zaten {module}/{action.value} yetkisine sahip")

    app.dependency_overrides[deps.get_current_user] = _as(role)
    kwargs = {"json": []} if method in ("post", "put") else {}
    response = getattr(client, method)(path, **kwargs)

    assert response.status_code == 403, (
        f"{role.value} {method.upper()} {path} -> {response.status_code} "
        f"(403 bekleniyordu; kapı bağlanmamış olabilir)"
    )
    assert module in response.json()["detail"]


@pytest.mark.parametrize("path,method,module,action", CASES)
def test_admin_passes_the_gate(path, method, module, action):
    """ADMIN kapıdan geçmeli.

    Kapı HTTP üzerinden değil doğrudan çağrılıyor: geçen istek uç gövdesini
    çalıştırır ve gövde, başka test modüllerinden sızan sahte DB'ye çarpar —
    burada ölçtüğümüz şey gövde değil, kapının kararı.
    """
    guard = deps.require_permission(module, action)
    admin = User(id=1, username="t", is_active=True, role=UserRole.ADMIN)

    assert asyncio.run(guard(current_user=admin)) is admin


@pytest.mark.parametrize("path,method,module,action", CASES)
def test_guard_raises_403_for_unprivileged_role(path, method, module, action):
    """Aynı kapı, yetkisiz rolde 403 yükseltmeli (HTTP'den bağımsız birim kontrolü)."""
    role = next(
        (r for r in (UserRole.TECHNICIAN, UserRole.FRONTDESK, UserRole.NURSE)
         if not has_permission(r, module, action)),
        None,
    )
    if role is None:
        pytest.skip(f"{module}/{action.value} için kısıtlı rol yok")

    guard = deps.require_permission(module, action)
    user = User(id=1, username="t", is_active=True, role=role)

    with pytest.raises(HTTPException) as exc:
        asyncio.run(guard(current_user=user))
    assert exc.value.status_code == 403


def test_matrix_denies_technician_write_on_patients():
    """Kapıların dayandığı matris varsayımı: TECHNICIAN hasta silemez."""
    assert has_permission(UserRole.TECHNICIAN, "patients", Action.READ)
    assert not has_permission(UserRole.TECHNICIAN, "patients", Action.DELETE)
    assert PERMISSION_MATRIX["patients"][UserRole.ADMIN]
