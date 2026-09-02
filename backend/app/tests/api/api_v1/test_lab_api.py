from datetime import date, datetime
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.api import deps
from app.models.user import User
from app.core.permissions import UserRole
from app.services.lab_parser_service import LabParserResponse, ParsedLabResult
from app.services.pdf_lab_parser_service import PDFLabParserResponse, PDFLabResult
from app.schemas.lab_analysis import LabTrendResponse, LabDataPoint

client = TestClient(app)


def override_get_current_user():
    return User(id=1, email="doctor@urolog.com", username="dr_test", is_active=True, is_superuser=True, role=UserRole.ADMIN)


app.dependency_overrides[deps.get_current_user] = override_get_current_user


@patch("app.services.lab_parser_service.LabParserService.parse_text")
def test_parse_lab_text_success(mock_parse):
    mock_parse.return_value = LabParserResponse(
        report_date="2026-08-30",
        results=[
            ParsedLabResult(
                test_name="PSA",
                original_name="PSA",
                value="1,4",
                unit="ng/mL"
            )
        ]
    )

    payload = {"text": "PSA: 1.4"}
    response = client.post("/api/v1/lab/parse", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["test_name"] == "PSA"
    assert data["results"][0]["value"] == "1,4"


def test_parse_lab_pdf_invalid_extension():
    files = {"file": ("test.txt", b"plain text", "text/plain")}
    response = client.post("/api/v1/lab/parse-pdf", files=files)
    assert response.status_code == 400
    assert "Sadece PDF" in response.json()["detail"]


@patch("app.services.pdf_lab_parser_service.PDFLabParserService.parse_pdf")
def test_parse_lab_pdf_success(mock_parse_pdf):
    mock_parse_pdf.return_value = PDFLabParserResponse(
        success=True,
        message="Başarılı",
        results=[
            PDFLabResult(test_name="PSA", value="1.2", unit="ng/mL")
        ]
    )

    files = {"file": ("report.pdf", b"%PDF-1.4 test bytes", "application/pdf")}
    response = client.post("/api/v1/lab/parse-pdf", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["results"]) == 1
    assert data["results"][0]["test_name"] == "PSA"


def test_analyze_lab_file_invalid_mimetype():
    files = {"file": ("archive.zip", b"PK...", "application/zip")}
    response = client.post("/api/v1/lab/analyze", files=files)
    assert response.status_code == 400
    assert "Desteklenmeyen dosya türü" in response.json()["detail"]


@patch("app.services.lab_analysis_service.LabAnalysisService.get_lab_trends")
def test_get_lab_trends_success(mock_trends):
    mock_trends.return_value = [
        LabTrendResponse(
            test_name="Total PSA",
            current_value=1.5,
            unit="ng/mL",
            trend_slope=0.1,
            is_critical=False,
            history=[
                LabDataPoint(value=1.2, date=datetime(2025, 1, 1), unit="ng/mL"),
                LabDataPoint(value=1.5, date=datetime(2026, 1, 1), unit="ng/mL")
            ]
        )
    ]

    payload = {
        "patient_id": "11111111-1111-1111-1111-111111111111",
        "test_names": ["Total PSA"]
    }
    response = client.post("/api/v1/lab-analysis/trends", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["test_name"] == "Total PSA"
    assert data[0]["current_value"] == 1.5
    assert len(data[0]["history"]) == 2


@patch("app.repositories.clinical.repository.ClinicalRepository.create_tetkik_sonuc_batch")
def test_genel_batch_accepts_rows_without_tarih(mock_batch):
    """REGRESYON: `tarih` göndermeyen satır 500 veriyordu.

    Şema `date` bekliyor; uç eksik tarihi `datetime.now()` ile dolduruyordu ve
    Pydantic saat bileşeni taşıyan datetime'ı date'e çeviremeyip
    date_from_datetime_inexact hatası veriyordu. Hata endpoint gövdesinde
    oluştuğu için istemci temiz 422 değil 500 alıyordu.
    """
    mock_batch.return_value = []

    response = client.post(
        "/api/v1/lab/genel/batch",
        json=[{
            "hasta_id": "11111111-1111-1111-1111-111111111111",
            "tetkik_adi": "Hemoglobin",
            "sonuc": "13.5",
        }],
    )

    assert response.status_code == 200
    objs = mock_batch.call_args.args[0]
    assert objs[0].tarih == date.today()


@patch("app.repositories.clinical.repository.ClinicalRepository.create_tetkik_sonuc_batch")
def test_genel_batch_keeps_explicit_tarih(mock_batch):
    mock_batch.return_value = []

    response = client.post(
        "/api/v1/lab/genel/batch",
        json=[{
            "hasta_id": "11111111-1111-1111-1111-111111111111",
            "tetkik_adi": "PSA",
            "tarih": "2026-03-10",
        }],
    )

    assert response.status_code == 200
    assert mock_batch.call_args.args[0][0].tarih == date(2026, 3, 10)
