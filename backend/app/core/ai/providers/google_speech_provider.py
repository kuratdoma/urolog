import base64
import logging
import httpx

from app.core.ai.interfaces import VoiceProvider

logger = logging.getLogger(__name__)


class GoogleSTTProvider(VoiceProvider):
    """
    Google Cloud Speech-to-Text Provider using REST API (via API Key).
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.url = (
            f"https://speech.googleapis.com/v1/speech:recognize?key={self.api_key}"
        )

    def update_api_key(self, api_key: str):
        if self.api_key == api_key:
            return
        self.api_key = api_key
        self.url = f"https://speech.googleapis.com/v1/speech:recognize?key={self.api_key}"

    async def transcribe(
        self, audio_bytes: bytes, mime_type: str, language: str = "tr-TR"
    ) -> str:
        if not self.api_key:
            raise ValueError("Google API Key is missing for STT.")

        # Convert audio to base64
        content = base64.b64encode(audio_bytes).decode("utf-8")

        # Determine encoding based on mime_type (simplified)
        # Google STT is picky about encoding. WEBM_OPUS is often safest for web uploads if supported,
        # otherwise LINEAR16 or MP3.
        # For this implementation, we will assume the input is compatible or user accepts the limitations.
        # The safest bet for general web audio (webm) is to rely on 'WEBM_OPUS' if available or
        # let Google auto-detect if possible (it's not always possible via REST).

        # NOTE: Standard REST API might require specific encodings.
        # MP3 support is beta/v2.
        # Let's try standard config.

        config = {
            "languageCode": language,
            "enableAutomaticPunctuation": True,
            "model": "default",
        }

        # Mapping mime-type to encoding hints if necessary
        # This is a basic implementation.

        payload = {"config": config, "audio": {"content": content}}

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.url, json=payload, timeout=60.0)
                response.raise_for_status()
                data = response.json()

                # Parse results
                # Response format: { results: [ { alternatives: [ { transcript: "..." } ] } ] }
                results = data.get("results", [])
                full_transcript = []
                for res in results:
                    if "alternatives" in res and len(res["alternatives"]) > 0:
                        full_transcript.append(res["alternatives"][0]["transcript"])

                return " ".join(full_transcript)
            except Exception as e:
                logger.error(f"Google STT failed: {e}")
                # Detail handling could be better
                raise
