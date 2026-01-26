"""Gemini API client wrapper."""
import structlog
from google import genai
from google.genai import types
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class GeminiClient:
    """Wrapper for Gemini API interactions."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.pro_model = settings.gemini_pro_model
        self.flash_model = settings.gemini_flash_model

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_content(
        self,
        prompt: str,
        model: str | None = None,
        response_schema: dict | None = None,
        thinking_level: str = "medium",
        temperature: float = 1.0,
    ) -> str:
        """Generate content using Gemini."""
        model = model or self.flash_model

        config = types.GenerateContentConfig(
            temperature=temperature,
            thinking_level=thinking_level,
        )

        if response_schema:
            config.response_mime_type = "application/json"
            config.response_schema = response_schema

        response = await self.client.aio.models.generate_content(
            model=model,
            contents=prompt,
            config=config,
        )

        return response.text

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_with_audio(
        self,
        audio_uri: str,
        mime_type: str,
        prompt: str,
        response_schema: dict | None = None,
        thinking_level: str = "high",
    ) -> str:
        """Generate content from audio input."""
        contents = [
            types.Content(
                parts=[
                    types.Part.from_uri(file_uri=audio_uri, mime_type=mime_type),
                    types.Part.from_text(prompt),
                ]
            )
        ]

        config = types.GenerateContentConfig(
            thinking_level=thinking_level,
            media_resolution="high",
        )

        if response_schema:
            config.response_mime_type = "application/json"
            config.response_schema = response_schema

        response = await self.client.aio.models.generate_content(
            model=self.pro_model,
            contents=contents,
            config=config,
        )

        return response.text

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    async def generate_with_audio_bytes(
        self,
        audio_data: bytes,
        mime_type: str,
        prompt: str,
        response_schema: dict | None = None,
        thinking_level: str = "high",
    ) -> str:
        """Generate content from audio bytes."""
        contents = [
            types.Content(
                parts=[
                    types.Part.from_bytes(data=audio_data, mime_type=mime_type),
                    types.Part.from_text(prompt),
                ]
            )
        ]

        config = types.GenerateContentConfig(
            thinking_level=thinking_level,
        )

        if response_schema:
            config.response_mime_type = "application/json"
            config.response_schema = response_schema

        response = await self.client.aio.models.generate_content(
            model=self.pro_model,
            contents=contents,
            config=config,
        )

        return response.text

    async def upload_file(self, file_path: str) -> str:
        """Upload a file to Gemini and return the URI."""
        uploaded = await self.client.aio.files.upload(file=file_path)
        return uploaded.uri

    async def create_chat(self, model: str | None = None, system_instruction: str | None = None):
        """Create a chat session."""
        model = model or self.flash_model
        config = {}
        if system_instruction:
            config["system_instruction"] = system_instruction

        return self.client.aio.chats.create(model=model, config=config if config else None)


# Singleton instance
_gemini_client: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get the Gemini client singleton."""
    global _gemini_client
    if _gemini_client is None:
        _gemini_client = GeminiClient()
    return _gemini_client
