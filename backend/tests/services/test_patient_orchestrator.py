import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import date, datetime
from app.services.orchestrators.patient_orchestrator import PatientOrchestrator
from app.core.user_context import UserContext
from app.schemas.patient.demographics import PatientDemographics
from app.schemas.clinical.examination import Examination

@pytest.fixture
def mock_db():
    return AsyncMock()

@pytest.fixture
def mock_context():
    return UserContext(user_id=1, username="test")

@pytest.mark.asyncio
async def test_get_patient_full_profile_resilience(mock_db, mock_context):
    patient_id = uuid4()
    
    # Mock Patient Data - Using a class that behaves like an ORM object
    class MockPatient:
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)
    
    mock_patient = MockPatient(
        id=patient_id,
        tc_kimlik="12345678901",
        ad="Test",
        soyad="Patient",
        cinsiyet="Erkek",
        dogum_tarihi=date(1990, 1, 1),
        created_at=datetime.now(),
        updated_at=None,
        # Add other optional fields to avoid 'from_attributes' failing if it looks for them
        dogum_yeri=None, kan_grubu=None, medeni_hal=None, meslek=None,
        adres=None, ev_tel=None, is_tel=None, cep_tel=None, email=None,
        kimlik_notlar=None, doktor=None, referans=None, postakodu=None,
        kurum=None, sigorta=None, ozelsigorta=None, cocuk_sayisi=None,
        sms_izin=None, email_izin=None, iletisim_kaynagi=None,
        iletisim_tercihi=None, indirim_grubu=None, dil=None,
        etiketler=None, kayit_notu=None, protokol_no=None
    )
    
    # We need to patch the repositories used in __init__
    with patch('app.services.orchestrators.patient_orchestrator.DemographicsRepository') as MockDemoRepo, \
         patch('app.services.orchestrators.patient_orchestrator.PatientStatsRepository') as MockStatsRepo, \
         patch('app.services.orchestrators.patient_orchestrator.PatientTimelineRepository') as MockTimelineRepo, \
         patch('app.services.orchestrators.patient_orchestrator.ClinicalRepository') as MockClinicalRepo:
        
        # Setup mocks
        demo_repo_instance = MockDemoRepo.return_value
        clinical_repo_instance = MockClinicalRepo.return_value
        
        demo_repo_instance.get_by_id = AsyncMock(return_value=mock_patient)
        
        # Simulate Clinical Shard Failure
        clinical_repo_instance.get_examinations_by_patient = AsyncMock(side_effect=Exception("Clinical Shard Down"))
        
        orchestrator = PatientOrchestrator(mock_db, mock_context)
        
        # Action - Should not raise exception
        result = await orchestrator.get_patient_full_profile(patient_id)
        
        # Assertions
        assert result is not None
        assert result.ad == "Test"
        assert result.son_muayene is None # Should gracefully handle failure
