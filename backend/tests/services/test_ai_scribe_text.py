import pytest
from unittest.mock import AsyncMock, patch
from app.services.ai_scribe_service import AIScribeService, AIScribeMode
from app.schemas.ai_scribe import AIScribeTextRequest, AIScribeResponse

@pytest.mark.asyncio
async def test_analyze_text_pii_scrubbing():
    """Test that input text is scrubbed before analysis"""
    service = AIScribeService()
    
    # Text with PII
    raw_text = "Hasta Ahmet Yılmaz, TC: 12345678901, Tel: 05321234567 şikayeti ile geldi."
    
    # Expected scrubbed text (based on regex in _sanitize_data)
    # 12345678901 -> [ID_MASKED]
    # 05321234567 -> [PHONE_MASKED]
    # Ahmet Yılmaz -> [NAME_MASKED]
    
    request = AIScribeTextRequest(text=raw_text, mode=AIScribeMode.LOCAL)
    
    # We need to mock the provider directly, not a private method that doesn't exist
    with patch.object(service.local_llm_provider, 'analyze_text', new_callable=AsyncMock) as mock_local_analyze:
        mock_local_analyze.return_value = {"sikayet": "Test Şikayet"}
        
        await service.analyze_text(raw_text, request)
        
        # Verify that the method was called with SCRUBBED text
        call_args = mock_local_analyze.call_args
        called_text = call_args[0][0] # First arg is text
        
        assert "[ID_MASKED]" in called_text
        assert "12345678901" not in called_text
        assert "[PHONE_MASKED]" in called_text
        assert "05321234567" not in called_text
        assert "[NAME_MASKED]" in called_text
        assert "Ahmet Yılmaz" not in called_text

@pytest.mark.asyncio
async def test_analyze_text_falls_back_to_local_on_gemini_quota_exceeded():
    """When Gemini reports quota exhaustion, analyze_text should
    transparently retry with the local provider instead of failing the
    request — and mode_used must reflect what actually ran."""
    from tenacity import RetryError
    from unittest.mock import MagicMock

    service = AIScribeService()
    text = "Basit bir metin."
    request = AIScribeTextRequest(text=text, mode=AIScribeMode.GEMINI)

    quota_error = ValueError("429 RESOURCE_EXHAUSTED: quota exceeded")
    fake_future = MagicMock()
    fake_future.exception.return_value = quota_error
    retry_error = RetryError(fake_future)

    with patch.object(service.gemini_provider, "is_available", return_value=True), \
         patch.object(service.gemini_provider, "analyze_text", new_callable=AsyncMock) as mock_gemini, \
         patch.object(service.local_llm_provider, "analyze_text", new_callable=AsyncMock) as mock_local:
        mock_gemini.side_effect = retry_error
        mock_local.return_value = {"sikayet": "Local fallback sonucu"}

        result = await service.analyze_text(text, request)

        mock_local.assert_awaited_once()
        assert result.mode_used == AIScribeMode.LOCAL
        assert result.sikayet == "Local fallback sonucu"


@pytest.mark.asyncio
async def test_analyze_text_response_structure():
    """Test that valid JSON from LLM is correctly converted to AIScribeResponse"""
    service = AIScribeService()
    text = "Basit bir metin."
    request = AIScribeTextRequest(text=text, mode=AIScribeMode.LOCAL)
    
    mock_llm_response = {
        "sikayet": "İdrar yanması",
        "oyku": "3 gündür devam ediyor",
        "disuri": "VAR",
        "tani1_icd": "N30.0",
        "confidence_score": 0.9
    }
    
    with patch.object(service.local_llm_provider, 'analyze_text', new_callable=AsyncMock) as mock_local:
        mock_local.return_value = mock_llm_response
        
        result = await service.analyze_text(text, request)
        
        assert isinstance(result, AIScribeResponse)
        assert result.sikayet == "İdrar yanması"
        assert result.disuri == "VAR"
        assert result.mode_used == AIScribeMode.LOCAL
