"""Tests for extraction prompts and schema."""
from src.services.extraction_prompts import (
    EXTRACTION_SCHEMA,
    AUDIO_EXTRACTION_PROMPT,
    VIDEO_EXTRACTION_PROMPT,
    DOCUMENT_EXTRACTION_PROMPT,
)


class TestExtractionPrompts:
    def test_all_prompts_are_nonempty_strings(self):
        """Test that all prompts are non-empty strings."""
        assert isinstance(AUDIO_EXTRACTION_PROMPT, str)
        assert len(AUDIO_EXTRACTION_PROMPT) > 100

        assert isinstance(VIDEO_EXTRACTION_PROMPT, str)
        assert len(VIDEO_EXTRACTION_PROMPT) > 100

        assert isinstance(DOCUMENT_EXTRACTION_PROMPT, str)
        assert len(DOCUMENT_EXTRACTION_PROMPT) > 100

    def test_schema_has_required_keys(self):
        """Test that the schema has the required top-level keys."""
        assert "properties" in EXTRACTION_SCHEMA
        props = EXTRACTION_SCHEMA["properties"]

        assert "summary" in props
        assert "decisions" in props
        assert "open_questions" in props
        assert "technologies_mentioned" in props

    def test_schema_required_fields(self):
        """Test that required fields are listed."""
        required = EXTRACTION_SCHEMA["required"]
        assert "summary" in required
        assert "decisions" in required
        assert "open_questions" in required
        assert "technologies_mentioned" in required

    def test_decision_schema_has_required_fields(self):
        """Test that decision items have the required fields."""
        decision_schema = EXTRACTION_SCHEMA["properties"]["decisions"]["items"]
        required = decision_schema["required"]

        assert "decision" in required
        assert "reasoning" in required
        assert "confidence" in required
        assert "timestamp_start" in required
        assert "timestamp_end" in required
        assert "domain" in required

    def test_audio_prompt_mentions_audio(self):
        """Test that audio prompt is specific to audio content."""
        assert "audio" in AUDIO_EXTRACTION_PROMPT.lower()
        assert "recording" in AUDIO_EXTRACTION_PROMPT.lower()

    def test_video_prompt_mentions_visual(self):
        """Test that video prompt emphasizes visual content."""
        assert "visual" in VIDEO_EXTRACTION_PROMPT.lower()
        assert "screen" in VIDEO_EXTRACTION_PROMPT.lower()

    def test_document_prompt_mentions_written(self):
        """Test that document prompt focuses on written content."""
        assert "document" in DOCUMENT_EXTRACTION_PROMPT.lower()
        assert "written" in DOCUMENT_EXTRACTION_PROMPT.lower() or "RFC" in DOCUMENT_EXTRACTION_PROMPT
