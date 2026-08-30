import pytest
from uuid import uuid4, UUID
from datetime import datetime, date
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole
from app.schemas.patient.legacy import PatientLegacyResponse

# Test ortamında FastAPICache başlatılmamışsa in-memory olarak başlat
try:
    FastAPICache.init(InMemoryBackend(), prefix="test-cache")
except Exception:
    pass

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_auth_overrides():
    def override_get_current_user():
        return User(id=1, email="doctor@urolog.com", username="dr_test", is_active=True, is_superuser=True, role=UserRole.ADMIN)

    app.dependency_overrides[deps.get_current_user] = override_get_current_user
    app.dependency_overrides[deps.get_current_active_superuser] = override_get_current_user
    yield
    app.dependency_overrides.pop(deps.get_current_user, None)
    app.dependency_overrides.pop(deps.get_current_active_superuser, None)


def _mock_dummy_patient(patient_id: UUID = None):
    p_id = patient_id or uuid4()
    return PatientLegacyResponse(
        id=p_id,
        tc_kimlik="12345678901",
        ad="Ahmet",
        soyad="Yılmaz",
        cinsiyet="Erkek",
        dogum_tarihi=date(1980, 1, 1),
        dogum_yeri="İstanbul",
        cep_tel="05321112233",
        created_at=datetime.utcnow(),
        muayene_count=2,
        operation_count=1,
    )


@patch("app.api.v1.endpoints.patients.PatientController.create_patient")
@patch("app.services.audit_service.AuditService.log")
def test_create_patient_success(mock_audit, mock_create):
    dummy = _mock_dummy_patient()
    mock_create.return_value = dummy
    mock_audit.return_value = AsyncMock()

    payload = {
        "ad": "Ahmet",
        "soyad": "Yılmaz",
        "tc_kimlik": "12345678901",
        "cinsiyet": "Erkek",
        "dogum_tarihi": "1980-01-01",
        "cep_tel": "05321112233",
    }

    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ad"] == "Ahmet"
    assert data["soyad"] == "Yılmaz"
    assert data["tc_kimlik"] == "12345678901"
    assert data["id"] == str(dummy.id)


def test_create_patient_validation_error():
    # Ad ve soyad zorunludur, eksik veri gönderimi
    payload = {
        "cinsiyet": "Erkek"
    }
    response = client.post("/api/v1/patients", json=payload)
    assert response.status_code == 422


@patch("app.api.v1.endpoints.patients.PatientController.get_patient_profile")
def test_read_patient_success(mock_get_profile):
    dummy = _mock_dummy_patient()
    mock_get_profile.return_value = dummy

    response = client.get(f"/api/v1/patients/{dummy.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(dummy.id)
    assert data["ad"] == dummy.ad
    assert data["soyad"] == dummy.soyad


@patch("app.api.v1.endpoints.patients.PatientController.get_patient_profile")
def test_read_patient_not_found(mock_get_profile):
    mock_get_profile.return_value = None
    random_id = uuid4()

    response = client.get(f"/api/v1/patients/{random_id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@patch("app.api.v1.endpoints.patients.PatientController.update_patient")
@patch("app.services.audit_service.AuditService.log")
def test_update_patient_success(mock_audit, mock_update):
    dummy = _mock_dummy_patient()
    dummy.ad = "Mehmet"
    mock_update.return_value = dummy
    mock_audit.return_value = AsyncMock()

    payload = {"ad": "Mehmet"}
    response = client.put(f"/api/v1/patients/{dummy.id}", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["ad"] == "Mehmet"


@patch("app.api.v1.endpoints.patients.PatientController.update_patient")
def test_update_patient_not_found(mock_update):
    mock_update.return_value = None
    random_id = uuid4()

    payload = {"ad": "Mehmet"}
    response = client.put(f"/api/v1/patients/{random_id}", json=payload)
    assert response.status_code == 404
    assert response.json()["detail"] == "Patient not found"


@patch("app.api.v1.endpoints.patients.PatientController.delete_patient")
@patch("app.services.audit_service.AuditService.log")
def test_delete_patient_success(mock_audit, mock_delete):
    mock_delete.return_value = True
    mock_audit.return_value = AsyncMock()
    random_id = uuid4()

    response = client.delete(f"/api/v1/patients/{random_id}")
    assert response.status_code == 200
    assert response.json() is True


@patch("app.api.v1.endpoints.patients.PatientController.delete_patient")
def test_delete_patient_not_found(mock_delete):
    mock_delete.return_value = False
    random_id = uuid4()

    response = client.delete(f"/api/v1/patients/{random_id}")
    assert response.status_code == 404


@patch("app.api.v1.endpoints.patients.PatientController.get_counts")
def test_get_patient_counts(mock_get_counts):
    mock_get_counts.return_value = {
        "muayene": 3,
        "imaging": 1,
        "operation": 0,
        "document": 2
    }
    dummy_id = uuid4()

    response = client.get(f"/api/v1/patients/{dummy_id}/counts")
    assert response.status_code == 200
    data = response.json()
    assert data["muayene"] == 3
    assert data["document"] == 2


@patch("app.api.v1.endpoints.patients.PatientController.get_patient_profile")
@patch("app.api.v1.endpoints.patients.ClinicalLegacyAdapter.get_patient_muayeneler")
@patch("app.api.v1.endpoints.patients.AppointmentRepository.get_by_patient")
@patch("app.api.v1.endpoints.patients.PatientController.get_timeline")
def test_get_patient_bootstrap_success(mock_timeline, mock_apt, mock_muayeneler, mock_profile):
    dummy = _mock_dummy_patient()
    mock_profile.return_value = dummy
    mock_muayeneler.return_value = [{"id": "m1", "sikayet": "Kontrol"}]
    mock_apt.return_value = [{"id": "a1", "title": "Randevu"}]
    mock_timeline.return_value = [{"type": "muayene", "date": "2026-01-01"}]

    response = client.get(f"/api/v1/patients/{dummy.id}/bootstrap")
    assert response.status_code == 200
    data = response.json()
    assert "patient" in data
    assert data["patient"]["id"] == str(dummy.id)
    assert len(data["muayeneler"]) == 1
    assert len(data["appointments"]) == 1
    assert len(data["timeline"]) == 1


@patch("app.api.v1.endpoints.patients.PatientController.get_unique_references")
def test_get_patient_references(mock_refs):
    mock_refs.return_value = ["Tanıdık", "İnternet", "Tavsiye"]

    response = client.get("/api/v1/patients/references")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert "Tanıdık" in data
