import pytest
from unittest.mock import AsyncMock, patch
from uuid import uuid4
from app.repositories.patient.demographics_repository import DemographicsRepository
from app.core.user_context import UserContext

@pytest.mark.asyncio
async def test_repository_automated_audit():
    # Setup
    mock_session = AsyncMock()
    context = UserContext(user_id=42, username="audit_test", ip_address="1.2.3.4")
    repo = DemographicsRepository(mock_session, context)
    patient_id = uuid4()
    
    # We mock AuditService.log to verify it's called by the decorator
    with patch("app.core.audit.AuditService.log", new_callable=AsyncMock) as mock_log:
        # Action
        await repo.get_by_id(patient_id)
        
        # Assertions
        mock_log.assert_called_once()
        args, kwargs = mock_log.call_args
        
        assert kwargs["action"] == "PATIENT_VIEW"
        assert kwargs["user_id"] == 42
        assert kwargs["resource_id"] == str(patient_id)
        assert kwargs["ip_address"] == "1.2.3.4"
        assert kwargs["details"]["method"] == "get_by_id"
        
        # Verify no PII in details
        assert "ad" not in kwargs["details"]
        assert "soyad" not in kwargs["details"]
