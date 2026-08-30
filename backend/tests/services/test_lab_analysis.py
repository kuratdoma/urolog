import pytest
from unittest.mock import MagicMock
from app.services.lab_analysis_service import LabAnalysisService
from app.schemas.lab_analysis import LabAnalysisResponse


@pytest.mark.asyncio
async def test_analyze_lab_file_success():
    service = LabAnalysisService()
    service.model = "gemini-1.5-flash"
    service.client = MagicMock()

    mock_response = MagicMock()
    mock_response.text = """
    ```json
    {
        "patient_name": "Test Patient",
        "report_date": "2023-01-01",
        "results": [
            {
                "test_name": "GLUKOZ",
                "result_value": "95",
                "unit": "mg/dL",
                "reference_range": "70-100",
                "is_abnormal": false,
                "category": "Biyokimya"
            }
        ]
    }
    ```
    """
    service.client.models.generate_content.return_value = mock_response

    result = await service.analyze_lab_file(b"fake_pdf_content", "application/pdf")

    assert isinstance(result, LabAnalysisResponse)
    assert result.patient_name == "Test Patient"
    assert len(result.results) == 1
    assert result.results[0]["test_name"] == "GLUKOZ"
    assert result.results[0]["result_value"] == "95"


@pytest.mark.asyncio
async def test_analyze_lab_file_error():
    service = LabAnalysisService()
    service.model = "gemini-1.5-flash"
    service.client = MagicMock()
    service.client.models.generate_content.side_effect = Exception("API Error")

    with pytest.raises(ValueError, match="Failed to analyze lab file"):
        await service.analyze_lab_file(b"content", "application/pdf")
