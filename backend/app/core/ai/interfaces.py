from abc import ABC, abstractmethod
from typing import Dict, Any


class VoiceProvider(ABC):
    """
    Abstract Base Class for Voice Processing Services (STT).
    """

    @abstractmethod
    async def transcribe(
        self, audio_bytes: bytes, mime_type: str, language: str = "tr-TR"
    ) -> str:
        """
        Convert audio to text (transcription).

        Args:
            audio_bytes: The raw audio file content.
            mime_type: The mime type of the audio (e.g., 'audio/webm').
            language: Target language code (default 'tr-TR').

        Returns:
            The raw transcribed text.
        """
        pass


class LLMProvider(ABC):
    """
    Abstract Base Class for Large Language Model Services.
    """

    @abstractmethod
    async def analyze_text(
        self, text: str, template: str, temperature: float = 0.1
    ) -> Dict[str, Any]:
        """
        Analyze text using an LLM and return structured JSON.

        Args:
            text: The text to analyze (e.g., patient transcript).
            template: The template/prompt structure to use.
            temperature: Creativity parameter (default 0.1 for deterministic output).

        Returns:
            A dictionary containing the extracted/generated data.
        """
        pass


class MultimodalProvider(ABC):
    """
    Abstract Base Class for providers that can handle Audio -> JSON directly in one step.
    (e.g., Gemini 1.5 Pro)
    """

    @abstractmethod
    async def analyze_audio(
        self, audio_bytes: bytes, mime_type: str, template: str
    ) -> Dict[str, Any]:
        """
        Analyze audio directly and return structured JSON.
        """
        pass
