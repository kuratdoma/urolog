import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, date
from app.services.orchestrators.report_orchestrator import ReportOrchestrator
from app.schemas.patient_report import PatientReportDTO, PatientDemographics
from app.services.pdf_report_service import PDFReportService
from app.core.user_context import UserContext

@pytest.mark.asyncio
async def test_report_orchestrator_finance_failure_resilience():
    """Verify that orchestrator survives a finance shard failure."""
    mock_db = AsyncMock()
    context = UserContext(user_id=1, username="test")
    orchestrator = ReportOrchestrator(mock_db, context)
    patient_id = uuid4()
    
    # 1. Mock Patient Data (SUCCESS)
    class MockEntity:
        def __getattr__(self, name):
            return None

    mock_patient = MockEntity()
    mock_patient.id = patient_id
    mock_patient.ad = "Resilient"
    mock_patient.soyad = "Patient"
    mock_patient.tc_kimlik = "12345"
    mock_patient.protokol_no = "P001"
    mock_patient.dogum_tarihi = date(1980, 1, 1)
    mock_patient.cep_tel = "555"
    mock_patient.cinsiyet = "E"
    mock_patient.kan_grubu = "A+"
    mock_patient.medeni_hal = "Evli"
    mock_patient.meslek = "Mühendis"
    mock_patient.cocuk_sayisi = "2"
    mock_patient.ev_tel = None
    mock_patient.is_tel = None
    mock_patient.email = "test@example.com"
    mock_patient.adres = "Test Adres"
    mock_patient.postakodu = "34000"
    mock_patient.kurum = "SGK"
    mock_patient.sigorta = "4A"
    mock_patient.ozelsigorta = None

    orchestrator.patient_repo.get_by_id = AsyncMock(return_value=mock_patient)
    
    # 2. Mock Clinical Data (SUCCESS)
    orchestrator.clinical_repo.get_examinations_by_patient = AsyncMock(return_value=[])
    
    # 3. Mock Finance Data (FAILURE)
    orchestrator.income_repo.get_patient_transactions = AsyncMock(side_effect=Exception("Finance Shard Down"))
    
    # Action
    report = await orchestrator.get_patient_report(patient_id)
    
    # Assertions
    assert report.demographics is not None
    assert report.demographics.ad == "Resilient"
    assert report.finance_summary is None
    assert "Finansal bilgiler alınamadı" in report.warnings
    assert report.has_warnings is True

def test_pdf_generation_with_partial_data():
    """Verify that PDF service handles a report with missing finance data."""
    patient_id = uuid4()
    report = PatientReportDTO(
        demographics=PatientDemographics(
            id=patient_id,
            ad="Test",
            soyad="User",
            protokol_no="PRO-01",
            dogum_tarihi=date(1990, 5, 5)
        ),
        examinations=[],
        lab_results=[],
        finance_summary=None, # MISSING
        warnings=["Finansal bilgiler alınamadı"],
        generated_at=datetime.now()
    )
    
    pdf_stream = PDFReportService.generate_patient_report_pdf(report)
    
    assert pdf_stream is not None
    assert pdf_stream.getbuffer().nbytes > 0
    # If it didn't crash, it handles partial data
