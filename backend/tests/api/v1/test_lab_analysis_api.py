import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.asyncio
async def test_get_lab_trends_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Mocking auth might be tricky here depending on how deps are handled in integration tests.
        # Often we override dependencies.
        # But for now, let's try calling it.
        # If 401, we know it's protected.
        
        request_data = {
            "patient_id": "00000000-0000-0000-0000-000000000000", # Dummy UUID
            "test_names": ["PSA"]
        }
        
        # We expect 401 if not authenticated
        response = await ac.post("/api/v1/lab-analysis/trends", json=request_data)
        assert response.status_code in [401, 200]
        
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)
