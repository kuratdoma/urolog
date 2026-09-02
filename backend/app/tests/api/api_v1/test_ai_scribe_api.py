from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole
from app.schemas.ai_scribe import AIScribeResponse

client = TestClient(app)


def override_get_current_user():
    return User(id=1, email="doctor@urolog.com", username="dr_test", is_active=True, is_superuser=True, role=UserRole.ADMIN)


app.dependency_overrides[deps.get_current_user] = override_get_current_user


@patch("app.api.v1.endpoints.ai_scribe.get_ai_scribe_service")
def test_get_ai_scribe_status(mock_get_service):
    mock_service = MagicMock()
    mock_service.check_local_services = AsyncMock(return_value={"whisper": True, "ollama": False})
    mock_service.is_gemini_available.return_value = True
    mock_service.get_available_templates.return_value = [{"id": "t1", "name": "BPH"}]
    mock_get_service.return_value = mock_service

    response = client.get("/api/v1/ai-scribe/status")
    assert response.status_code == 200
    data = response.json()
    assert "enabled" in data
    assert data["gemini_available"] is True
    assert data["local_whisper"] is True


@patch("app.api.v1.endpoints.ai_scribe.get_ai_scribe_service")
def test_get_ai_scribe_templates(mock_get_service):
    mock_service = MagicMock()
    mock_service.get_available_templates.return_value = [
        {"id": "bph", "name": "BPH Şablonu", "description": "Benign Prostat Hiperplazisi", "is_default": True}
    ]
    mock_get_service.return_value = mock_service

    response = client.get("/api/v1/ai-scribe/templates")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "bph"


@patch("app.api.v1.endpoints.ai_scribe.get_ai_scribe_service")
def test_analyze_audio_success(mock_get_service):
    mock_service = MagicMock()
    mock_service.analyze_consultation = AsyncMock(return_value=AIScribeResponse(
        clinical_note="Hasta şikayeti idrar yaparken zorlanma. Tanı BPH konuldu.",
        tani1="BPH",
        mode_used="gemini",
        processing_time_seconds=1.2
    ))
    mock_get_service.return_value = mock_service

    audio_content = b"RIFF" + b"0" * 1500  # 1500 byte geçerli ses boyutu
    files = {"audio": ("recording.wav", audio_content, "audio/wav")}
    data = {"mode": "gemini", "include_transcript": "false"}

    response = client.post("/api/v1/ai-scribe/analyze", files=files, data=data)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["tani1"] == "BPH"
    assert res_json["mode_used"] == "gemini"


def test_analyze_audio_too_short():
    # 1000 byte'tan küçük ses dosyaları 400 hatası vermeli
    audio_content = b"short"
    files = {"audio": ("short.wav", audio_content, "audio/wav")}
    data = {"mode": "gemini"}

    response = client.post("/api/v1/ai-scribe/analyze", files=files, data=data)
    assert response.status_code == 400
    assert "çok kısa" in response.json()["detail"].lower()


def test_analyze_audio_unsupported_format():
    audio_content = b"0" * 1500
    files = {"audio": ("document.pdf", audio_content, "application/pdf")}
    data = {"mode": "gemini"}

    response = client.post("/api/v1/ai-scribe/analyze", files=files, data=data)
    assert response.status_code == 400
    assert "desteklenmeyen" in response.json()["detail"].lower()


@patch("app.api.v1.endpoints.ai_scribe.get_ai_scribe_service")
def test_analyze_text_success(mock_get_service):
    mock_service = MagicMock()
    mock_service.analyze_text = AsyncMock(return_value=AIScribeResponse(
        clinical_note="Hasta 54 yaşında, pollaküri mevcut. İlaç tedavisi başlandı.",
        tani1="Pollaküri",
        mode_used="gemini",
        processing_time_seconds=0.8
    ))
    mock_get_service.return_value = mock_service

    payload = {
        "text": "Hasta 54 yaşında erkek, sık idrara çıkma şikayeti var.",
        "mode": "gemini"
    }

    response = client.post("/api/v1/ai-scribe/analyze-text", json=payload)
    assert response.status_code == 200
    res_json = response.json()
    assert res_json["tani1"] == "Pollaküri"
    assert res_json["mode_used"] == "gemini"
