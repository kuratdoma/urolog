"""
AI Scribe provider tests — Gemini/Local error paths, retry behavior, and
local-service health checks. Complements test_ai_scribe_text.py, which
covers the service-layer PII scrubbing/response-building logic.
"""
import pytest
import httpx
from tenacity import RetryError
from unittest.mock import AsyncMock, MagicMock, patch

from app.core.ai.providers.gemini_provider import GeminiProvider
from app.core.ai.providers.local_provider import LocalLLMProvider, LocalVoiceProvider


def _underlying(retry_error: RetryError) -> BaseException:
    """analyze_text/analyze_audio are @retry-wrapped, so after 3 exhausted
    attempts tenacity raises RetryError, not the original exception —
    mirrors how ai_scribe.py's error handler unwraps it (last_attempt)."""
    return retry_error.last_attempt.exception()


# ---------------------------------------------------------------------------
# GeminiProvider
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_gemini_provider_not_initialized_raises():
    """No API key -> client stays None -> analyze_text must raise, not
    silently return empty data."""
    provider = GeminiProvider(api_key="", model_name="gemini-test")
    assert provider.is_available() is False

    with patch("asyncio.sleep", new=AsyncMock(return_value=None)):
        with pytest.raises(RetryError) as exc_info:
            await provider.analyze_text("some text", "template")
    underlying = _underlying(exc_info.value)
    assert isinstance(underlying, ValueError)
    assert "not initialized" in str(underlying)


@pytest.mark.asyncio
async def test_gemini_provider_blocked_content_raises_friendly_message():
    """A safety-blocked generation should surface a Turkish, user-facing
    ValueError rather than the raw provider exception."""
    provider = GeminiProvider(api_key="", model_name="gemini-test")
    provider.client = MagicMock()
    provider.model = "gemini-test"

    def _raise_blocked(*args, **kwargs):
        raise RuntimeError("Response was blocked by safety filters")

    provider.client.models.generate_content = _raise_blocked

    with patch("asyncio.sleep", new=AsyncMock(return_value=None)):
        with pytest.raises(RetryError) as exc_info:
            await provider.analyze_text("some text", "template")
    underlying = _underlying(exc_info.value)
    assert isinstance(underlying, ValueError)
    assert "Güvenlik politikaları" in str(underlying)


@pytest.mark.asyncio
async def test_gemini_provider_empty_response_raises():
    provider = GeminiProvider(api_key="", model_name="gemini-test")
    provider.client = MagicMock()
    provider.model = "gemini-test"

    mock_response = MagicMock()
    mock_response.candidates = []
    provider.client.models.generate_content = MagicMock(return_value=mock_response)

    with patch("asyncio.sleep", new=AsyncMock(return_value=None)):
        with pytest.raises(RetryError) as exc_info:
            await provider.analyze_text("some text", "template")
    assert isinstance(_underlying(exc_info.value), ValueError)


def test_gemini_parse_response_extracts_embedded_json():
    """LLMs often wrap JSON in prose/markdown fences; _parse_response must
    still extract the object instead of silently returning {}."""
    provider = GeminiProvider(api_key="", model_name="gemini-test")
    text = 'Here is the result:\n```json\n{"sikayet": "test"}\n```\nDone.'
    result = provider._parse_response(text)
    assert result == {"sikayet": "test"}


def test_gemini_parse_response_unparseable_returns_empty_dict():
    provider = GeminiProvider(api_key="", model_name="gemini-test")
    assert provider._parse_response("not json at all") == {}


# ---------------------------------------------------------------------------
# LocalLLMProvider / LocalVoiceProvider — error propagation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_local_llm_connection_error_propagates():
    """A failed connection to Ollama must raise, not be swallowed into an
    empty/success response."""
    provider = LocalLLMProvider(endpoint="http://localhost:11434/api/generate", model="test")

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("refused")):
        with pytest.raises(httpx.ConnectError):
            await provider.analyze_text("text", "template")


@pytest.mark.asyncio
async def test_local_voice_connection_error_propagates():
    provider = LocalVoiceProvider(endpoint="http://localhost:5000/whisperaudio")

    with patch("httpx.AsyncClient.post", side_effect=httpx.ConnectError("refused")):
        with pytest.raises(httpx.ConnectError):
            await provider.transcribe(b"fake-audio-bytes", "audio/webm")


# ---------------------------------------------------------------------------
# Health checks
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_local_llm_health_check_true_when_reachable():
    provider = LocalLLMProvider(endpoint="http://localhost:11434/api/generate", model="test")
    mock_response = MagicMock(status_code=200)

    with patch("httpx.AsyncClient.get", new=AsyncMock(return_value=mock_response)):
        assert await provider.health_check() is True


@pytest.mark.asyncio
async def test_local_llm_health_check_false_when_unreachable():
    provider = LocalLLMProvider(endpoint="http://localhost:11434/api/generate", model="test")

    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("refused")):
        assert await provider.health_check() is False


@pytest.mark.asyncio
async def test_local_voice_health_check_false_when_unreachable():
    provider = LocalVoiceProvider(endpoint="http://localhost:5000/whisperaudio")

    with patch("httpx.AsyncClient.get", side_effect=httpx.ConnectError("refused")):
        assert await provider.health_check() is False
