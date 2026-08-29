import httpx
import json
import logging
from typing import Dict, Any
from urllib.parse import urlsplit

from app.core.config import settings
from app.core.ai.interfaces import VoiceProvider, LLMProvider

logger = logging.getLogger(__name__)

# Health checks must not block the /status endpoint for long if a local
# service is down/unreachable.
_HEALTH_CHECK_TIMEOUT = 2.0


class LocalVoiceProvider(VoiceProvider):
    def __init__(self, endpoint: str):
        self.endpoint = endpoint

    async def health_check(self) -> bool:
        """Best-effort reachability check. No standard health path exists
        for the local Whisper service, so we just probe the origin — any
        HTTP response (even 404/405) means the port is answering."""
        parts = urlsplit(self.endpoint)
        origin = f"{parts.scheme}://{parts.netloc}/"
        try:
            async with httpx.AsyncClient(timeout=_HEALTH_CHECK_TIMEOUT) as client:
                await client.get(origin)
            return True
        except Exception:
            return False

    async def transcribe(
        self, audio_bytes: bytes, mime_type: str, language: str = "tr-TR"
    ) -> str:
        """
        Transcribe audio using local Whisper service.
        """
        async with httpx.AsyncClient(timeout=settings.AI_SCRIBE_TIMEOUT) as client:
            filename = "recording.webm"  # Default, Whisper endpoint might ignore this or rely on content-type
            files = {"audio": (filename, audio_bytes, mime_type)}

            try:
                response = await client.post(self.endpoint, files=files)
                response.raise_for_status()
                return response.json().get("text", "")
            except Exception as e:
                logger.error(f"Local Whisper transcription failed: {e}")
                raise


class LocalLLMProvider(LLMProvider):
    def __init__(self, endpoint: str, model: str):
        self.endpoint = endpoint
        self.model = model

    async def health_check(self) -> bool:
        """Probe Ollama's standard /api/tags (list local models) endpoint."""
        parts = urlsplit(self.endpoint)
        tags_url = f"{parts.scheme}://{parts.netloc}/api/tags"
        try:
            async with httpx.AsyncClient(timeout=_HEALTH_CHECK_TIMEOUT) as client:
                response = await client.get(tags_url)
                return response.status_code == 200
        except Exception:
            return False

    async def analyze_text(
        self, text: str, template: str, temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Analyze text using local Ollama service.
        """
        async with httpx.AsyncClient(timeout=settings.AI_SCRIBE_TIMEOUT) as client:
            # We construct the prompt by combining template + text, similar to Gemini
            llm_prompt = f"{template}\n\n## TRANSCRIPT:\n{text}"

            payload = {
                "model": self.model,
                "prompt": llm_prompt,
                "format": "json",
                "stream": False,
                # "options": {"temperature": temperature} # Ollama supports options
            }

            try:
                llm_response = await client.post(self.endpoint, json=payload)
                llm_response.raise_for_status()

                # Parse Ollama response
                # Ollama returns 'response' field
                return json.loads(llm_response.json().get("response", "{}"))
            except Exception as e:
                logger.error(f"Local LLM analysis failed: {e}")
                raise
