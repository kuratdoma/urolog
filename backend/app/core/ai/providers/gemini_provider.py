import asyncio
import logging
import json
import re
import tempfile
import os
from typing import Dict, Any

try:
    from google import genai
    from google.genai import types

    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None
    types = None

from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.ai.interfaces import LLMProvider, MultimodalProvider

logger = logging.getLogger(__name__)


class GeminiProvider(LLMProvider, MultimodalProvider):
    def __init__(self, api_key: str, model_name: str):
        self.api_key = api_key
        self.model_name = model_name
        self.client = None
        self.model = None

        if GEMINI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model = self.model_name
                logger.info(f"Gemini initialized with model: {self.model_name}")
            except Exception as e:
                logger.error(f"Gemini initialization failed: {e}")
        else:
            logger.warning("Gemini library not found or API key missing.")

    def update_api_key(self, api_key: str):
        if self.api_key == api_key:
            return
        self.api_key = api_key
        if GEMINI_AVAILABLE and self.api_key:
            try:
                self.client = genai.Client(api_key=self.api_key)
                self.model = self.model_name
                logger.info("Gemini API key updated successfully.")
            except Exception as e:
                logger.error(f"Gemini API key update failed: {e}")
                self.client = None
        else:
            self.client = None

    def is_available(self) -> bool:
        return self.client is not None and self.model is not None

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def analyze_text(
        self, text: str, template: str, temperature: float = 0.1
    ) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("Gemini client is not initialized.")

        full_content = f"{template}\n\n## HASTA NOTLARI / TRANSKRİPT:\n{text}"

        config = types.GenerateContentConfig(
            response_mime_type="application/json", temperature=temperature
        )

        try:
            response = await asyncio.to_thread(
                self.client.models.generate_content, model=self.model, contents=full_content, config=config
            )

            if not response or not response.candidates:
                raise ValueError("Gemini yanıt üretmedi")

            return self._parse_response(response.text)
        except Exception as gen_err:
            logger.error(f"Gemini text generation error: {gen_err}")
            if "blocked" in str(gen_err).lower():
                raise ValueError("Güvenlik politikaları nedeniyle analiz edilemedi.")
            raise gen_err

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def analyze_audio(
        self, audio_bytes: bytes, mime_type: str, template: str
    ) -> Dict[str, Any]:
        if not self.client:
            raise ValueError("Gemini client is not initialized.")

        suffix = self._get_file_suffix(mime_type)

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_audio:
            temp_path = temp_audio.name
            temp_audio.write(audio_bytes)

        upload_mime_type = mime_type
        if mime_type.startswith("video/"):
            upload_mime_type = mime_type.replace("video/", "audio/", 1)

        uploaded_file = None
        try:
            uploaded_file = await asyncio.to_thread(
                self.client.files.upload, file=temp_path, config={'mime_type': upload_mime_type}
            )

            state = str(uploaded_file.state)
            while state == "PROCESSING" or state == "State.PROCESSING":
                await asyncio.sleep(2)
                uploaded_file = await asyncio.to_thread(
                    self.client.files.get, name=uploaded_file.name
                )
                state = str(uploaded_file.state)

            if state == "FAILED" or state == "State.FAILED":
                raise ValueError("Gemini file processing failed")

            config = types.GenerateContentConfig(
                response_mime_type="application/json", 
                temperature=0.1,
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                ]
            )

            try:
                response = await asyncio.to_thread(
                    self.client.models.generate_content,
                    model=self.model,
                    contents=[template, uploaded_file],
                    config=config,
                )

                if not response or not response.candidates:
                    raise ValueError("Gemini yanıt üretmedi (Boş yanıt)")

                return self._parse_response(response.text)
            except Exception as gen_err:
                logger.error(f"Gemini generation error: {gen_err}")
                if "blocked" in str(gen_err).lower():
                    raise ValueError(
                        "Üzgünüz, bu ses kaydı güvenlik politikaları nedeniyle analiz edilemedi."
                    )
                raise gen_err
        finally:
            if os.path.exists(temp_path):
                try:
                    os.unlink(temp_path)
                except Exception:
                    pass
            if uploaded_file:
                try:
                    await asyncio.to_thread(self.client.files.delete, name=uploaded_file.name)
                except Exception:
                    pass

    def _parse_response(self, text: str) -> Dict[str, Any]:
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", text, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group())
                except Exception:
                    pass
            return {}

    def _get_file_suffix(self, mime_type: str) -> str:
        mapping = {
            "audio/wav": ".wav",
            "audio/webm": ".webm",
            "audio/mp4": ".m4a",
            "audio/ogg": ".ogg",
            "audio/mpeg": ".mp3",
            "video/webm": ".webm",
            "video/mp4": ".mp4",
            "video/ogg": ".ogg",
        }
        return mapping.get(mime_type, ".webm")
