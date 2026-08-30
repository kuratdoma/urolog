import pytest
import io
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole

client = TestClient(app)

# Dummy user mock for auth bypass
def override_get_current_user():
    user = User(id=1, email="test@test.com", is_active=True, is_superuser=True, role=UserRole.ADMIN)
    return user

app.dependency_overrides[deps.get_current_user] = override_get_current_user

@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.list_forms")
def test_get_consent_forms(mock_list_forms):
    mock_list_forms.return_value = [
        {"id": "1", "display_name": "Test Form", "category": "Test"}
    ]
    
    response = client.get("/api/v1/consent-forms")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "1"

@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.add_form")
def test_upload_consent_form(mock_add_form):
    mock_add_form.return_value = {"id": "2", "display_name": "New Form", "category": "Test"}
    
    file_content = b"PDF content"
    files = {"file": ("test.pdf", file_content, "application/pdf")}
    data = {"display_name": "New Form", "category": "Test"}
    
    response = client.post("/api/v1/consent-forms", files=files, data=data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["id"] == "2"

def test_upload_consent_form_invalid_extension():
    file_content = b"Not a PDF"
    files = {"file": ("test.txt", file_content, "text/plain")}
    data = {"display_name": "New Form", "category": "Test"}
    
    response = client.post("/api/v1/consent-forms", files=files, data=data)
    assert response.status_code == 400
    assert response.json()["detail"] == "Sadece PDF dosyaları yüklenebilir"

@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.delete_form")
def test_delete_consent_form(mock_delete_form):
    mock_delete_form.return_value = True
    response = client.delete("/api/v1/consent-forms/1")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.delete_form")
def test_delete_consent_form_not_found(mock_delete_form):
    mock_delete_form.return_value = False
    response = client.delete("/api/v1/consent-forms/999")
    assert response.status_code == 404

@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.generate")
@patch("app.api.v1.endpoints.consent_forms.ConsentFormService.list_forms")
def test_preview_consent_form(mock_list_forms, mock_generate, monkeypatch):
    mock_list_forms.return_value = [{"id": "1", "display_name": "Test Form", "category": "Test"}]
    mock_generate.return_value = io.BytesIO(b"PDF Content")
    
    from sqlalchemy.ext.asyncio import AsyncSession
    mock_session = MagicMock(spec=AsyncSession)
    
    class AsyncMockResult:
        def __init__(self, item):
            self.item = item
        def scalars(self):
            class S:
                def first(self_s):
                    return self.item
            return S()
            
    class DummyHasta:
        id = "h1"
        ad = "Alp"
        soyad = "Test"
        tc_kimlik = "111"
        dogum_tarihi = None
        protokol_no = "123"
        doktor = "Dr. M"
        
    class DummyMuayene:
        sikayet = "Test sikayet"
        ozgecmis = None
        kullandigi_ilaclar = None
        aliskanliklar = None
        allerjiler = None
        sonuc = None

    async def mock_execute(query):
        query_str = str(query)
        if "muayene" in query_str.lower():
            return AsyncMockResult(DummyMuayene())
        elif "hasta" in query_str.lower():
            return AsyncMockResult(DummyHasta())
        elif "doktor" in query_str.lower():
            return AsyncMockResult(None)
        return AsyncMockResult(None)
        
    mock_session.execute = mock_execute
    
    async def override_get_db_with_mock():
        yield mock_session
        
    app.dependency_overrides[deps.get_db] = override_get_db_with_mock
    
    response = client.get("/api/v1/consent-forms/1/preview/h1")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content == b"PDF Content"
