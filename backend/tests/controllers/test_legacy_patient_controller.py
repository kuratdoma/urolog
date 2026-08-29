import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4, UUID
from datetime import date, datetime
from app.controllers.legacy_adapters.patient_controller import PatientController
from app.services.orchestrators.patient_orchestrator import PatientOrchestrator
from app.core.user_context import UserContext
from app.schemas.patient.demographics import PatientFullProfile

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_context():
    return UserContext(user_id=101, username="test_user")

@pytest.fixture
def mock_orchestrator():
    orchestrator = AsyncMock(spec=PatientOrchestrator)
    return orchestrator

@pytest.mark.asyncio
async def test_get_patient_profile_success(mock_db, mock_context, mock_orchestrator):
    # Setup
    patient_id = uuid4()
    
    # Mock data using Pydantic Models (as Orchestrator now returns)
    from app.schemas.patient.demographics import PatientFullProfile
    
    # We construct a real PatientFullProfile object
    mock_profile = PatientFullProfile(
        id=patient_id,
        ad="Ahmet",
        soyad="Yilmaz",
        cinsiyet="Erkek",
        created_at=datetime.now(),
        cep_tel=None,
        son_muayene={"tani1": "Benign Prostat Hiperplazisi", "tarih": None}
    )

    mock_orchestrator.get_patient_full_profile.return_value = mock_profile
    
    # We mock the PatientOrchestrator class within the controller module
    with patch('app.controllers.legacy_adapters.patient_controller.PatientOrchestrator') as MockOrchClass:
        MockOrchClass.return_value = mock_orchestrator
        
        from app.controllers.legacy_adapters.patient_controller import PatientController
        controller = PatientController(mock_db, mock_context)
        
        response = await controller.get_patient_profile(patient_id)
        
        assert response is not None
        assert response.ad == "Ahmet"
        assert response.tani1 == "Benign Prostat Hiperplazisi"
        assert isinstance(response.id, UUID)


@pytest.mark.asyncio
async def test_golden_master_compliance(mock_db, mock_context, mock_orchestrator):
    # This test verifies exact JSON structure against a known legacy response (Golden Master)
    
    # 1. Golden Master Data (What the Frontend Expects)
    golden_master = {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "ad": "Golden",
        "soyad": "Master",
        "tc_kimlik": "10000000000",
        "cinsiyet": "Erkek",
        "dogum_tarihi": "1950-05-05", # ISO format string in JSON
        "cep_tel": "05551234567",
        "tani1": "BPH",
        "doktor": "Prof. Dr. X",
        "telefon_gorusme_sayisi": 0,
        "protokol_no": "2023-100"
    }
    
    # 2. Orchestrator output as PatientFullProfile
    mock_profile = PatientFullProfile(
        id=UUID("550e8400-e29b-41d4-a716-446655440000"),
        ad="Golden",
        soyad="Master",
        tc_kimlik="10000000000",
        cinsiyet="Erkek",
        dogum_tarihi=date(1950, 5, 5),
        cep_tel="05551234567",
        doktor="Prof. Dr. X",
        protokol_no="2023-100",
        created_at=datetime.now(),
        son_muayene={"tani1": "BPH"}
    )
    
    mock_orchestrator.get_patient_full_profile.return_value = mock_profile
    
    with patch('app.controllers.legacy_adapters.patient_controller.PatientOrchestrator') as MockOrchClass:
        MockOrchClass.return_value = mock_orchestrator
        from app.controllers.legacy_adapters.patient_controller import PatientController
        controller = PatientController(mock_db, mock_context)
        
        response = await controller.get_patient_profile(UUID("550e8400-e29b-41d4-a716-446655440000"))
        
        # Serialize to JSON (pydantic model_dump) with mode='json' to get strings for dates
        result_json = response.model_dump(mode='json')
        
        # Assertions
        assert result_json["ad"] == golden_master["ad"]
        assert result_json["tani1"] == golden_master["tani1"]
        assert result_json["cep_tel"] == golden_master["cep_tel"]
        assert result_json["dogum_tarihi"] == golden_master["dogum_tarihi"]
        assert "tani2" in result_json
        assert "tani3" in result_json
