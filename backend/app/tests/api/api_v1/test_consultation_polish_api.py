"""Konsültasyon raporu "AI İLE DÜZENLE" ucu için API testleri.

POST /api/v1/clinical/consultation-reports/polish-letter
"""
import pytest
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole
from app.schemas.ai_scribe import AIScribeMode

client = TestClient(app)

ENDPOINT = "/api/v1/clinical/consultation-reports/polish-letter"


def override_get_current_user():
    return User(id=1, email="doctor@urolog.com", username="dr_test", is_active=True, is_superuser=True, role=UserRole.ADMIN)


async def override_get_db():
    yield MagicMock()


app.dependency_overrides[deps.get_current_user] = override_get_current_user
app.dependency_overrides[deps.get_db] = override_get_db


@patch("app.api.v1.endpoints.clinical.reports.AuditService.log", new_callable=AsyncMock)
@patch("app.api.v1.endpoints.clinical.reports.get_ai_scribe_service")
def test_polish_letter_success(mock_get_service, mock_audit_log):
    mock_service = MagicMock()
    mock_service.polish_letter = AsyncMock(return_value={
        "polished_text": "Sayın Dr. Demir, hastamız ... değerlendirilmek üzere yönlendirilmiştir.",
        "mode_used": AIScribeMode.GEMINI,
        "fact_drift_warning": False,
    })
    mock_get_service.return_value = mock_service

    payload = {"text": "Sayın Dr. Demir, hastamız değerlendirilmek üzere yönlendirilmiştir.", "mode": "gemini"}
    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 200
    data = response.json()
    assert data["mode_used"] == "gemini"
    assert data["fact_drift_warning"] is False
    assert "polished_text" in data


@patch("app.api.v1.endpoints.clinical.reports.AuditService.log", new_callable=AsyncMock)
@patch("app.api.v1.endpoints.clinical.reports.get_ai_scribe_service")
def test_polish_letter_writes_audit_log_without_letter_content(mock_get_service, mock_audit_log):
    """Audit kaydı meta veri (mod, uzunluk, fact-drift bayrağı) tutmalı,
    hastaya ait mektup METNİNİ (PHI) içermemeli."""
    mock_service = MagicMock()
    mock_service.polish_letter = AsyncMock(return_value={
        "polished_text": "düzenlenmiş metin",
        "mode_used": AIScribeMode.GEMINI,
        "fact_drift_warning": True,
    })
    mock_get_service.return_value = mock_service

    draft_text = "Hastamız Ahmet Yılmaz, 500 mg dozunda ilaç kullanmaktadır."
    payload = {"text": draft_text, "mode": "gemini"}
    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 200
    assert mock_audit_log.await_count == 1
    _, kwargs = mock_audit_log.call_args
    assert kwargs["action"] == "KONSULTASYON_MEKTUP_AI_DUZENLE"
    assert kwargs["resource_type"] == "consultation_report_letter"
    assert kwargs["details"]["mode_used"] == AIScribeMode.GEMINI
    assert kwargs["details"]["fact_drift_warning"] is True
    assert kwargs["details"]["text_length"] == len(draft_text)
    # PHI sızıntısını önlemek için ham metin audit detaylarına yazılmamalı
    serialized_details = str(kwargs["details"])
    assert draft_text not in serialized_details
    assert "Ahmet Yılmaz" not in serialized_details


@patch("app.api.v1.endpoints.clinical.reports.get_ai_scribe_service")
def test_polish_letter_disabled_returns_403(mock_get_service):
    with patch("app.api.v1.endpoints.clinical.reports.settings.AI_SCRIBE_ENABLED", False):
        payload = {"text": "Yeterince uzun bir taslak metin.", "mode": "gemini"}
        response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 403
    mock_get_service.assert_not_called()


@patch("app.api.v1.endpoints.clinical.reports.AuditService.log", new_callable=AsyncMock)
@patch("app.api.v1.endpoints.clinical.reports.get_ai_scribe_service")
def test_polish_letter_service_failure_returns_500_and_does_not_write_audit(
    mock_get_service, mock_audit_log
):
    mock_service = MagicMock()
    mock_service.polish_letter = AsyncMock(side_effect=Exception("Gemini ve Ollama başarısız"))
    mock_get_service.return_value = mock_service

    payload = {"text": "Yeterince uzun bir taslak metin.", "mode": "gemini"}
    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 500
    # Taslak metin frontend'de değişmeden kalır; backend tarafında da
    # başarısız bir çağrı için audit kaydı YAZILMAMALI (yazılan tek şey
    # başarılı bir AI düzenleme meta verisi olmalı).
    mock_audit_log.assert_not_called()


def test_polish_letter_rejects_too_short_text():
    payload = {"text": "kısa", "mode": "gemini"}
    response = client.post(ENDPOINT, json=payload)
    assert response.status_code == 422


@patch("app.api.v1.endpoints.clinical.reports.AuditService.log", new_callable=AsyncMock)
@patch("app.api.v1.endpoints.clinical.reports.get_ai_scribe_service")
def test_polish_letter_value_error_returns_400(mock_get_service, mock_audit_log):
    mock_service = MagicMock()
    mock_service.polish_letter = AsyncMock(side_effect=ValueError("Google Gemini API is not configured."))
    mock_get_service.return_value = mock_service

    payload = {"text": "Yeterince uzun bir taslak metin.", "mode": "gemini"}
    response = client.post(ENDPOINT, json=payload)

    assert response.status_code == 400
    mock_audit_log.assert_not_called()
