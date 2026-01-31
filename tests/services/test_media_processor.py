"""Tests for unified media processor."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock

from tests.conftest import SAMPLE_EXTRACTION_RESPONSE


def _make_mock_session(
    session_id=1,
    owner_id=1,
    source_content_type="audio",
    audio_file_path=None,
    video_file_path=None,
    document_file_path=None,
):
    """Create a mock CodingSession."""
    session = MagicMock()
    session.id = session_id
    session.owner_id = owner_id
    session.source_content_type = source_content_type
    session.audio_file_path = audio_file_path
    session.video_file_path = video_file_path
    session.document_file_path = document_file_path
    session.processing_status = "pending"
    session.summary = None
    session.open_questions = []
    session.technologies_mentioned = []
    session.extraction_metadata = {}
    return session


@pytest.fixture
def mock_session_audio():
    return _make_mock_session(
        source_content_type="audio",
        audio_file_path="/media/1/session.mp3",
    )


@pytest.fixture
def mock_session_video():
    return _make_mock_session(
        source_content_type="video",
        video_file_path="/media/1/session.mp4",
    )


@pytest.fixture
def mock_session_document():
    return _make_mock_session(
        source_content_type="document",
        document_file_path="/media/1/doc.pdf",
    )


class TestMediaProcessorRouting:
    @pytest.mark.asyncio
    async def test_routes_audio_session_to_audio_processor(
        self, mock_db, mock_gemini, mock_embeddings, mock_storage, mock_session_audio
    ):
        """Test that audio sessions are routed to audio processing."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session_audio
        mock_db.execute.return_value = mock_result

        mock_gemini.upload_file.return_value = "gs://bucket/session.mp3"
        mock_gemini.generate_with_audio.return_value = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            result = await processor.process_session(mock_db, 1, 1)

        mock_gemini.generate_with_audio.assert_called_once()
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]

    @pytest.mark.asyncio
    async def test_routes_video_session_to_video_processor(
        self, mock_db, mock_gemini, mock_embeddings, mock_storage, mock_session_video
    ):
        """Test that video sessions are routed to video processing."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session_video
        mock_db.execute.return_value = mock_result

        mock_gemini.upload_file.return_value = "gs://bucket/session.mp4"
        mock_gemini.generate_with_video.return_value = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            result = await processor.process_session(mock_db, 1, 1)

        mock_gemini.generate_with_video.assert_called_once()
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]

    @pytest.mark.asyncio
    async def test_routes_document_session_to_document_processor(
        self, mock_db, mock_gemini, mock_embeddings, mock_storage, mock_session_document
    ):
        """Test that document sessions are routed to document processing."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session_document
        mock_db.execute.return_value = mock_result

        mock_storage.get_file.return_value = b"This is a design document with decisions."
        mock_gemini.generate_with_document_text.return_value = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage), \
             patch("src.services.media_processor.parse_document", return_value="Parsed document text"):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            result = await processor.process_session(mock_db, 1, 1)

        mock_gemini.generate_with_document_text.assert_called_once()
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]

    @pytest.mark.asyncio
    async def test_process_session_not_found_raises(self, mock_db, mock_gemini, mock_embeddings, mock_storage):
        """Test that processing a non-existent session raises ValueError."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            with pytest.raises(ValueError, match="not found"):
                await processor.process_session(mock_db, 999, 1)

    @pytest.mark.asyncio
    async def test_processing_failure_sets_failed_status(
        self, mock_db, mock_gemini, mock_embeddings, mock_storage, mock_session_audio
    ):
        """Test that processing failure sets the session status to 'failed'."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session_audio
        mock_db.execute.return_value = mock_result

        mock_gemini.upload_file.side_effect = Exception("Gemini upload error")

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            with pytest.raises(Exception, match="Gemini upload error"):
                await processor.process_session(mock_db, 1, 1)

        assert mock_session_audio.processing_status == "failed"
        assert "error" in mock_session_audio.extraction_metadata

    @pytest.mark.asyncio
    async def test_save_extraction_creates_decisions_with_correct_source_type(
        self, mock_db, mock_gemini, mock_embeddings, mock_storage, mock_session_video
    ):
        """Test that decisions are created with the correct source_type."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session_video
        mock_db.execute.return_value = mock_result

        mock_gemini.upload_file.return_value = "gs://bucket/session.mp4"
        mock_gemini.generate_with_video.return_value = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.services.media_processor.get_gemini_client", return_value=mock_gemini), \
             patch("src.services.media_processor.get_embedding_service", return_value=mock_embeddings), \
             patch("src.services.media_processor.get_storage_service", return_value=mock_storage):
            from src.services.media_processor import MediaProcessor
            processor = MediaProcessor()

            await processor.process_session(mock_db, 1, 1)

        # Check that db.add was called for each decision
        assert mock_db.add.call_count == len(SAMPLE_EXTRACTION_RESPONSE["decisions"])


class TestVideoMimeTypeDetection:
    def test_video_mime_type_detection(self):
        """Test that video MIME types are correctly mapped."""
        from src.services.media_processor import VIDEO_MIME_TYPES

        assert VIDEO_MIME_TYPES["mp4"] == "video/mp4"
        assert VIDEO_MIME_TYPES["webm"] == "video/webm"
        assert VIDEO_MIME_TYPES["mov"] == "video/quicktime"
        assert VIDEO_MIME_TYPES["avi"] == "video/x-msvideo"
        assert VIDEO_MIME_TYPES["mpeg"] == "video/mpeg"
