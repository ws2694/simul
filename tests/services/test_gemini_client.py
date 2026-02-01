"""Tests for Gemini client methods."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


class TestGeminiClientVideoMethod:
    @pytest.mark.asyncio
    async def test_generate_with_video_constructs_correct_parts(self):
        """Test that generate_with_video constructs the right content parts."""
        mock_response = MagicMock()
        mock_response.text = '{"summary": "test"}'

        mock_aio_models = AsyncMock()
        mock_aio_models.generate_content.return_value = mock_response

        mock_aio = MagicMock()
        mock_aio.models = mock_aio_models

        mock_client_instance = MagicMock()
        mock_client_instance.aio = mock_aio

        mock_part_uri = MagicMock()
        mock_part_text = MagicMock()
        mock_content = MagicMock()
        mock_config = MagicMock()

        with patch("src.services.gemini_client.genai") as mock_genai, \
             patch("src.services.gemini_client.types") as mock_types, \
             patch("src.services.gemini_client.settings") as mock_settings:
            mock_settings.gemini_api_key = "test-key"
            mock_settings.gemini_pro_model = "gemini-pro"
            mock_settings.gemini_flash_model = "gemini-flash"
            mock_genai.Client.return_value = mock_client_instance

            mock_types.Part.from_uri.return_value = mock_part_uri
            mock_types.Part.from_text.return_value = mock_part_text
            mock_types.Content.return_value = mock_content
            mock_types.GenerateContentConfig.return_value = mock_config

            from src.services.gemini_client import GeminiClient
            client = GeminiClient()

            result = await client.generate_with_video(
                video_uri="gs://bucket/video.mp4",
                mime_type="video/mp4",
                prompt="Analyze this video",
                response_schema={"type": "object"},
            )

        # Verify Part.from_uri was called with video URI and mime type
        mock_types.Part.from_uri.assert_called_once_with(
            file_uri="gs://bucket/video.mp4", mime_type="video/mp4"
        )
        # Verify Part.from_text was called with the prompt
        mock_types.Part.from_text.assert_called_once_with("Analyze this video")
        # Verify generate_content was called with the pro model
        mock_aio_models.generate_content.assert_called_once()
        call_kwargs = mock_aio_models.generate_content.call_args.kwargs
        assert call_kwargs["model"] == "gemini-pro"
        assert result == '{"summary": "test"}'


class TestGeminiClientDocumentMethod:
    @pytest.mark.asyncio
    async def test_generate_with_document_text_includes_content_in_prompt(self):
        """Test that generate_with_document_text prepends document content to prompt."""
        mock_response = MagicMock()
        mock_response.text = '{"summary": "doc test"}'

        mock_aio_models = AsyncMock()
        mock_aio_models.generate_content.return_value = mock_response

        mock_aio = MagicMock()
        mock_aio.models = mock_aio_models

        mock_client_instance = MagicMock()
        mock_client_instance.aio = mock_aio

        mock_config = MagicMock()

        with patch("src.services.gemini_client.genai") as mock_genai, \
             patch("src.services.gemini_client.types") as mock_types, \
             patch("src.services.gemini_client.settings") as mock_settings:
            mock_settings.gemini_api_key = "test-key"
            mock_settings.gemini_pro_model = "gemini-pro"
            mock_settings.gemini_flash_model = "gemini-flash"
            mock_genai.Client.return_value = mock_client_instance
            mock_types.GenerateContentConfig.return_value = mock_config

            from src.services.gemini_client import GeminiClient
            client = GeminiClient()

            result = await client.generate_with_document_text(
                document_text="This is the RFC content",
                prompt="Analyze this document",
                response_schema={"type": "object"},
            )

        mock_aio_models.generate_content.assert_called_once()
        call_kwargs = mock_aio_models.generate_content.call_args.kwargs
        # The contents should include both the prompt and the document text
        contents = call_kwargs["contents"]
        assert "This is the RFC content" in contents
        assert "Analyze this document" in contents
        assert call_kwargs["model"] == "gemini-pro"
        assert result == '{"summary": "doc test"}'
