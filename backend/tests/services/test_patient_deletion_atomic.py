import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from app.services.orchestrators.patient_orchestrator import PatientOrchestrator
from app.core.user_context import UserContext

@pytest.mark.asyncio
async def test_delete_patient_atomic_success():
    """Verify that a successful deletion marks all shards as deleted."""
    mock_db = AsyncMock()
    context = UserContext(user_id=1, username="admin")
    orchestrator = PatientOrchestrator(mock_db, context)
    patient_id = uuid4()
    
    # Mock repos
    orchestrator.demographics_repo = AsyncMock()
    orchestrator.clinical_repo = AsyncMock()
    orchestrator.income_repo = AsyncMock()
    
    result = await orchestrator.delete_patient_transactional(patient_id)
    
    assert result is True
    orchestrator.clinical_repo.delete_patient_clinical_data.assert_called_once_with(patient_id)
    orchestrator.income_repo.delete_patient_finance_data.assert_called_once_with(patient_id)
    orchestrator.demographics_repo.soft_delete.assert_called_once_with(patient_id)
    mock_db.commit.assert_called_once()

@pytest.mark.asyncio
async def test_delete_patient_atomic_rollback_on_clinical_failure():
    """Verify that failure in clinical shard triggers rollback and stops demographics delete."""
    mock_db = AsyncMock()
    context = UserContext(user_id=1, username="admin")
    orchestrator = PatientOrchestrator(mock_db, context)
    patient_id = uuid4()
    
    # Mock repos
    orchestrator.demographics_repo = AsyncMock()
    orchestrator.clinical_repo = AsyncMock()
    orchestrator.income_repo = AsyncMock()
    
    # Simulate clinical failure
    orchestrator.clinical_repo.delete_patient_clinical_data.side_effect = Exception("Clinical Shard Down")
    
    with pytest.raises(Exception, match="Clinical Shard Down"):
        await orchestrator.delete_patient_transactional(patient_id)
        
    # Assertions
    mock_db.rollback.assert_called_once()
    mock_db.commit.assert_not_called()
    # Demographics should NOT have been called after clinical failed
    orchestrator.demographics_repo.soft_delete.assert_not_called()

@pytest.mark.asyncio
async def test_delete_patient_audit_log():
    """Verify that a 'SYSTEM_DELETE_PATIENT' audit log is generated."""
    mock_db = AsyncMock()
    context = UserContext(user_id=99, username="power_user")
    orchestrator = PatientOrchestrator(mock_db, context)
    patient_id = uuid4()
    
    orchestrator.demographics_repo = AsyncMock()
    orchestrator.clinical_repo = AsyncMock()
    orchestrator.income_repo = AsyncMock()

    with patch("app.services.audit_service.AuditService.log", new_callable=AsyncMock) as mock_audit:
        await orchestrator.delete_patient_transactional(patient_id)
        
        # Check audit log
        kwargs = mock_audit.call_args.kwargs
        assert kwargs["action"] == "SYSTEM_DELETE_PATIENT"
        assert kwargs["user_id"] == 99
        assert kwargs["resource_id"] == str(patient_id)
        assert "purged_resources" in kwargs["details"]
