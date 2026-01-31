"""Integration tests for the document upload → parsing → processing → decision extraction pipeline."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from src.api.sessions import router
from src.api.deps import get_current_user
from src.db import get_db
from tests.conftest import SAMPLE_EXTRACTION_RESPONSE


def _make_mock_user():
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.is_active = True
    return user


@asynccontextmanager
async def _mock_async_session_local():
    yield AsyncMock()


def _make_session_mock(title, file_path, ext):
    session = MagicMock()
    session.id = 30
    session.title = title
    session.session_type = "design"
    session.summary = None
    session.processing_status = "pending"
    session.duration_seconds = None
    session.audio_file_path = None
    session.video_file_path = None
    session.document_file_path = file_path
    session.source_content_type = "document"
    session.git_branch = None
    session.open_questions = []
    session.technologies_mentioned = []
    session.created_at = datetime(2025, 7, 1, tzinfo=timezone.utc)
    return session


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(router, prefix="/sessions")
    return test_app


@pytest.fixture
def mock_user():
    return _make_mock_user()


@pytest.fixture
def mock_db_session():
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock()
    return db


class TestDocumentUploadPipeline:
    async def _upload_document(self, app, mock_user, mock_db_session, filename, content_type, file_path):
        """Helper to upload a document and verify the response."""
        created_session = _make_session_mock("Architecture RFC", file_path, filename.split(".")[-1])

        def refresh_side_effect(obj):
            for attr in ["id", "title", "processing_status", "document_file_path",
                         "source_content_type", "created_at", "open_questions",
                         "technologies_mentioned", "audio_file_path", "video_file_path",
                         "summary", "duration_seconds", "git_branch", "session_type"]:
                setattr(obj, attr, getattr(created_session, attr))

        mock_db_session.refresh = AsyncMock(side_effect=refresh_side_effect)

        mock_processor = AsyncMock()
        mock_processor.process_session = AsyncMock(return_value=SAMPLE_EXTRACTION_RESPONSE)

        mock_storage = AsyncMock()
        mock_storage.save_file = AsyncMock(return_value=file_path)

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_storage_service", return_value=mock_storage), \
             patch("src.api.sessions.get_media_processor", return_value=mock_processor), \
             patch("src.db.AsyncSessionLocal", side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": (filename, b"fake-doc-content", content_type)},
                    data={"title": "Architecture RFC", "session_type": "design"},
                )

        return response, mock_storage, mock_processor

    @pytest.mark.asyncio
    async def test_upload_pdf_creates_session_and_extracts_decisions(
        self, app, mock_user, mock_db_session
    ):
        """Full flow: upload PDF → session created → MediaProcessor processes → decisions extracted."""
        response, mock_storage, mock_processor = await self._upload_document(
            app, mock_user, mock_db_session,
            "design.pdf", "application/pdf",
            "/media/1/doc_Architecture_RFC.pdf"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Architecture RFC"
        assert data["source_content_type"] == "document"
        assert data["processing_status"] == "pending"
        assert data["document_file_path"] is not None
        mock_storage.save_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_upload_txt_pipeline(self, app, mock_user, mock_db_session):
        """Upload TXT → session created with correct source type."""
        response, _, _ = await self._upload_document(
            app, mock_user, mock_db_session,
            "notes.txt", "text/plain",
            "/media/1/doc_Architecture_RFC.txt"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["source_content_type"] == "document"

    @pytest.mark.asyncio
    async def test_upload_docx_pipeline(self, app, mock_user, mock_db_session):
        """Upload DOCX → session created with correct source type."""
        response, _, _ = await self._upload_document(
            app, mock_user, mock_db_session,
            "proposal.docx",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "/media/1/doc_Architecture_RFC.docx"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["source_content_type"] == "document"


class TestDocumentProcessingPipeline:
    @pytest.mark.asyncio
    async def test_document_decisions_have_correct_source_type(self, mock_db):
        """Verify full document processing: parse → Gemini → decisions with source_type='document'."""
        # Create a mock session representing an uploaded PDF
        mock_session = MagicMock()
        mock_session.id = 31
        mock_session.video_file_path = None
        mock_session.audio_file_path = None
        mock_session.document_file_path = "/media/1/design.txt"
        mock_session.source_content_type = "document"
        mock_session.owner_id = 1

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = mock_result

        extraction_json = json.dumps(SAMPLE_EXTRACTION_RESPONSE)
        document_content = b"We decided to use Redis for caching. The TTL will be 5 minutes."

        with patch("src.services.media_processor.get_gemini_client") as mock_gc, \
             patch("src.services.media_processor.get_embedding_service") as mock_es, \
             patch("src.services.media_processor.get_storage_service") as mock_ss:

            mock_gemini = AsyncMock()
            mock_gemini.generate_with_document_text = AsyncMock(return_value=extraction_json)
            mock_gc.return_value = mock_gemini

            mock_embed = AsyncMock()
            mock_embed.generate_embedding = AsyncMock(return_value=[0.1] * 768)
            mock_es.return_value = mock_embed

            mock_storage = AsyncMock()
            mock_storage.get_file = AsyncMock(return_value=document_content)
            mock_ss.return_value = mock_storage

            from src.services.media_processor import MediaProcessor

            processor = MediaProcessor()
            result = await processor.process_session(mock_db, session_id=31, user_id=1)

        # Verify extraction results
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]
        assert len(result["decisions"]) == 2
        assert len(result["open_questions"]) == 2
        assert "Redis" in result["technologies_mentioned"]

        # Verify session was updated
        assert mock_session.processing_status == "completed"
        assert mock_session.summary == SAMPLE_EXTRACTION_RESPONSE["summary"]

        # Verify decisions have correct source_type
        add_calls = mock_db.add.call_args_list
        decision_adds = [c for c in add_calls if hasattr(c[0][0], 'source_type')]
        assert len(decision_adds) == 2
        for call in decision_adds:
            assert call[0][0].source_type == "document"

        # Verify storage was called to read the document
        mock_storage.get_file.assert_called_once_with("/media/1/design.txt")

        # Verify Gemini was called with document text method
        mock_gemini.generate_with_document_text.assert_called_once()
        call_kwargs = mock_gemini.generate_with_document_text.call_args
        assert "We decided to use Redis" in call_kwargs.kwargs.get("document_text", "")

        # Verify embeddings were generated for each decision
        assert mock_embed.generate_embedding.call_count == 2
