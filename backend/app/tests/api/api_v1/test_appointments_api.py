from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole
from app.schemas.appointment import RandevuResponse

client = TestClient(app)


def override_get_current_user():
    return User(id=1, email="doctor@urolog.com", username="dr_test", full_name="Dr. Test", is_active=True, is_superuser=True, role=UserRole.ADMIN)


app.dependency_overrides[deps.get_current_user] = override_get_current_user


def _mock_dummy_appointment(apt_id: int = 101):
    now = datetime.utcnow()
    return RandevuResponse(
        id=apt_id,
        title="Muayene - Ali Kaya",
        type="muayene",
        start=now,
        end=now + timedelta(minutes=30),
        status="scheduled",
        doctor_id=1,
        doctor_name="Dr. Test"
    )


@patch("app.repositories.appointment_repository.AppointmentRepository.get_all")
def test_get_appointments(mock_get_all):
    dummy = _mock_dummy_appointment()
    mock_get_all.return_value = [dummy]

    response = client.get("/api/v1/appointments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == 101
    assert data[0]["title"] == "Muayene - Ali Kaya"


@patch("app.repositories.appointment_repository.AppointmentRepository.get_by_id")
def test_get_appointment_by_id_success(mock_get_id):
    dummy = _mock_dummy_appointment(102)
    mock_get_id.return_value = dummy

    response = client.get("/api/v1/appointments/102")
    assert response.status_code == 200
    assert response.json()["id"] == 102


@patch("app.repositories.appointment_repository.AppointmentRepository.get_by_id")
def test_get_appointment_by_id_not_found(mock_get_id):
    mock_get_id.return_value = None

    response = client.get("/api/v1/appointments/999")
    assert response.status_code == 404
    assert "Randevu bulunamadı" in response.json()["detail"]


@patch("app.repositories.appointment_repository.AppointmentRepository.create")
def test_create_appointment_success(mock_create):
    dummy = _mock_dummy_appointment(103)
    mock_create.return_value = dummy

    now = datetime.utcnow()
    payload = {
        "title": "Kontrol Randevusu",
        "type": "kontrol",
        "start": now.isoformat(),
        "end": (now + timedelta(minutes=20)).isoformat(),
        "status": "scheduled",
    }

    response = client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 103
    assert data["title"] == "Muayene - Ali Kaya"


@patch("app.repositories.appointment_repository.AppointmentRepository.update")
def test_update_appointment_success(mock_update):
    dummy = _mock_dummy_appointment(101)
    dummy.status = "completed"
    mock_update.return_value = dummy

    payload = {"status": "completed"}
    response = client.put("/api/v1/appointments/101", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "completed"


@patch("app.repositories.appointment_repository.AppointmentRepository.get_by_id")
@patch("app.repositories.appointment_repository.AppointmentRepository.delete")
def test_delete_appointment_success(mock_delete, mock_get_id):
    dummy = MagicMock()
    dummy.id = 101
    dummy.google_event_id = None
    mock_get_id.return_value = dummy
    mock_delete.return_value = True

    response = client.delete("/api/v1/appointments/101")
    assert response.status_code == 200
    assert response.json()["message"] == "Randevu başarıyla silindi"
