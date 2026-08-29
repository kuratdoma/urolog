import pytest
from app.services.ai_scribe_service import AIScribeService

@pytest.fixture
def ai_scribe_service():
    """Returns a fresh instance of AIScribeService for testing."""
    return AIScribeService()

@pytest.fixture
def mock_gemini_provider(mocker):
    """Mocks the GeminiProvider inside AIScribeService."""
    provider_mock = mocker.patch("app.services.ai_scribe_service.GeminiProvider")
    return provider_mock
