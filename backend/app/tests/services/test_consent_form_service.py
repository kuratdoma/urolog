import os
import io
import json
import pytest
from app.services.consent_form_service import ConsentFormService, PatientConsentData


@pytest.fixture
def mock_consent_dir(tmp_path, monkeypatch):
    """Mocks the _CONSENT_FORMS_DIR to use a temporary directory."""
    # Create a manifest.json
    manifest_data = [
        {
            "id": "123",
            "filename": "test_form.pdf",
            "display_name": "Test Form",
            "category": "Test"
        }
    ]
    manifest_file = tmp_path / "manifest.json"
    manifest_file.write_text(json.dumps(manifest_data))

    # Create a dummy PDF
    import fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), "HASTA ADI SOYADI:")
    page.insert_text((50, 70), "Tarih:")
    pdf_path = tmp_path / "test_form.pdf"
    doc.save(str(pdf_path))
    doc.close()

    monkeypatch.setattr("app.services.consent_form_service._CONSENT_FORMS_DIR", str(tmp_path))
    return tmp_path


@pytest.fixture
def service(mock_consent_dir):
    return ConsentFormService()


def test_list_forms(service):
    forms = service.list_forms()
    assert len(forms) == 1
    assert forms[0]["id"] == "123"
    assert forms[0]["display_name"] == "Test Form"


def test_add_form(service, mock_consent_dir):
    new_pdf = b"fake pdf content"
    result = service.add_form(new_pdf, "new_form.pdf", "New Form", "Test Category")

    assert result["display_name"] == "New Form"
    assert result["category"] == "Test Category"
    assert "id" in result

    # Verify manifest updated
    with open(mock_consent_dir / "manifest.json") as f:
        data = json.load(f)
    assert len(data) == 2
    assert data[1]["filename"] == "new_form.pdf"

    # Verify file created
    assert os.path.exists(mock_consent_dir / "new_form.pdf")


def test_delete_form(service, mock_consent_dir):
    res = service.delete_form("123")
    assert res is True

    # Verify manifest
    with open(mock_consent_dir / "manifest.json") as f:
        data = json.load(f)
    assert len(data) == 0

    # Verify file deleted
    assert not os.path.exists(mock_consent_dir / "test_form.pdf")


def test_delete_form_not_found(service):
    res = service.delete_form("nonexistent")
    assert res is False


def test_generate_pdf_success(service):
    patient_data = PatientConsentData(
        hasta_adi_soyadi="Alp Test",
        protokol_no="12345",
        doktor_adi_soyadi="Dr. Murat",
        tarih="05/07/2026",
        saat="14:30"
    )

    stream = service.generate("123", patient_data)
    assert isinstance(stream, io.BytesIO)
    stream.seek(0)
    pdf_bytes = stream.read()
    assert len(pdf_bytes) > 0


def test_generate_pdf_not_found(service):
    patient_data = PatientConsentData(
        hasta_adi_soyadi="Alp Test",
        protokol_no="12345",
        doktor_adi_soyadi="Dr. Murat",
        tarih="05/07/2026",
        saat="14:30"
    )
    with pytest.raises(FileNotFoundError):
        service.generate("999", patient_data)
