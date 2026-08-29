import pytest
from app.services.lab_analysis_service import LabAnalysisService
from app.schemas.lab_analysis import LabTrendRequest, LabTrendResponse
from datetime import datetime, timedelta

def test_normalize_units():
    service = LabAnalysisService()
    
    # Test valid normalization
    assert service._normalize_unit("ng/ml") == "ng/mL"
    assert service._normalize_unit("NG/ML") == "ng/mL"
    
    # Test unknown unit
    assert service._normalize_unit("unknown") == "unknown"

def test_calculate_trend_slope():
    service = LabAnalysisService()
    
    # Rising trend
    data = [
        {"value": 1.0, "date": datetime.now() - timedelta(days=90)},
        {"value": 2.0, "date": datetime.now()}
    ]
    slope = service._calculate_slope(data)
    assert slope > 0

    # Stable trend
    data = [
        {"value": 1.0, "date": datetime.now() - timedelta(days=90)},
        {"value": 1.0, "date": datetime.now()}
    ]
    slope = service._calculate_slope(data)
    assert slope == 0


@pytest.mark.asyncio
async def test_get_lab_trends():
    service = LabAnalysisService()
    
    # Mock DB Session and Result
    from unittest.mock import AsyncMock, MagicMock
    mock_db = AsyncMock()
    
    # Mock data return from sharded_clinical_lab_results
    # Assuming the query returns objects with attribute access or dict
    # Let's assume the repository returns a list of dictionaries or objects
    # For now, we'll mock the internal fetch method if we decide to separate Repos, 
    # but here we might need to mock the db.execute result.
    
    # Let's mock a method `_fetch_lab_data` to isolate DB logic if possible, 
    # or mock the db execution result directly.
    
    # Mock row objects
    row1 = MagicMock()
    row1.tetkik_adi = "PSA"
    row1.sonuc = "4.0"
    row1.birim = "ng/mL"
    row1.tarih = datetime(2023, 1, 1)
    row1.sembol = None
    
    row2 = MagicMock()
    row2.tetkik_adi = "PSA"
    row2.sonuc = "5.0"
    row2.birim = "ng/ml" # Test normalization
    row2.tarih = datetime(2023, 4, 1)
    row2.sembol = None

    # Mock execute result
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [row1, row2]
    mock_db.execute.return_value = mock_result
    
    request = LabTrendRequest(patient_id="123", test_names=["PSA"])
    
    response_list = await service.get_lab_trends(mock_db, request)
    
    assert len(response_list) == 1
    psa_trend = response_list[0]
    assert psa_trend.test_name == "PSA (Total)"
    assert psa_trend.current_value == 5.0
    assert psa_trend.is_critical == False # feature removed per user request
    assert len(psa_trend.history) == 2
    assert psa_trend.history[0].unit == "ng/mL"
    assert psa_trend.history[1].unit == "ng/mL" # Should be normalized


def test_normalize_test_name_psa():
    service = LabAnalysisService()
    
    # Test Prostat Spesifik Antijen normalization
    assert service._normalize_test_name("PROSTAT SPESİFİK ANTİJEN") == "PSA (Total)"
    assert service._normalize_test_name("prostat spesifik antijen (serbest)") == "PSA (Serbest)"
    assert service._normalize_test_name("SERBEST PROSTAT SPESİFİK ANTİJEN") == "PSA (Serbest)"
    assert service._normalize_test_name("prostat spesıfık antıjen") == "PSA (Total)"
    assert service._normalize_test_name("prostat spesifik antigen") == "PSA (Total)"
