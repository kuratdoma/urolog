import pytest
from unittest.mock import patch, MagicMock
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession
from app.main import app
from app.api import deps
from app.services.lab_analysis_service import LabAnalysisService


@pytest.mark.asyncio
async def test_get_lab_trends_endpoint():
    mock_db = MagicMock(spec=AsyncSession)

    async def override_db():
        yield mock_db

    app.dependency_overrides[deps.get_db] = override_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        request_data = {
            "patient_id": "00000000-0000-0000-0000-000000000000",
            "test_names": ["PSA"],
        }

        with patch.object(LabAnalysisService, "get_lab_trends", return_value=[]):
            response = await ac.post("/api/v1/lab-analysis/trends", json=request_data)
            assert response.status_code in [401, 200]

            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list)

    app.dependency_overrides.pop(deps.get_db, None)
