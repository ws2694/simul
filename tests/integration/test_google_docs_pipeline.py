"""Integration tests for the Google Docs import → processing → decision extraction pipeline."""
import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from src.api.google_auth import router
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


@pytest.fixture
def app():
    test_app = FastAPI()
    test_app.include_router(router, prefix="/google")
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


class TestGoogleDocsPipeline:
    @pytest.mark.asyncio
    async def test_import_google_doc_full_pipeline(
        self, app, mock_user, mock_db_session
    ):
        """Full flow: OAuth connected → fetch doc → save → create session → MediaProcessor processes."""
        # Simulate the session after DB refresh
        def refresh_side_effect(obj):
            obj.id = 50
            obj.title = "Q3 Architecture Proposal"
            obj.processing_status = "pending"
            obj.source_content_type = "document"
            obj.session_type = "design"
            obj.summary = None
            obj.duration_seconds = None
            obj.audio_file_path = None
            obj.video_file_path = None
            obj.document_file_path = "/media/1/gdoc_Q3_Architecture_Proposal.txt"
            obj.git_branch = "feature/arch-refactor"
            obj.open_questions = []
            obj.technologies_mentioned = []
            obj.created_at = datetime(2025, 7, 1, tzinfo=timezone.utc)

        mock_db_session.refresh = AsyncMock(side_effect=refresh_side_effect)

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        # Mock Google Auth Service
        mock_auth = AsyncMock()
        mock_auth.is_connected = AsyncMock(return_value=True)
        mock_auth.fetch_google_doc_text = AsyncMock(
            return_value=(
                "Q3 Architecture Proposal\n\n"
                "We decided to migrate from PostgreSQL to CockroachDB for horizontal scaling.\n"
                "The team agreed on a 3-phase migration plan.\n\n"
                "Open question: Should we use a connection pooler like PgBouncer?\n"
                "Technologies: CockroachDB, PostgreSQL, PgBouncer, Kubernetes"
            )
        )

        # Mock Storage Service
        mock_storage = AsyncMock()
        mock_storage.save_file = AsyncMock(
            return_value="/media/1/gdoc_Q3_Architecture_Proposal.txt"
        )

        # Mock MediaProcessor
        mock_processor = AsyncMock()
        mock_processor.process_session = AsyncMock(return_value=SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_auth), \
             patch("src.api.google_auth.get_storage_service", return_value=mock_storage), \
             patch("src.api.google_auth.get_media_processor", return_value=mock_processor), \
             patch("src.db.AsyncSessionLocal", side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/google/docs/import",
                    json={
                        "doc_id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
                        "title": "Q3 Architecture Proposal",
                        "session_type": "design",
                        "git_branch": "feature/arch-refactor",
                    },
                )

        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Q3 Architecture Proposal"
        assert data["source_content_type"] == "document"
        assert data["processing_status"] == "pending"

        # Verify auth was checked
        mock_auth.is_connected.assert_called_once()

        # Verify doc was fetched from Google (positional args)
        mock_auth.fetch_google_doc_text.assert_called_once_with(
            mock_db_session,
            1,
            "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms",
        )

        # Verify doc content was saved to storage
        mock_storage.save_file.assert_called_once()
        save_args = mock_storage.save_file.call_args
        saved_content = save_args[0][0]
        assert b"Q3 Architecture Proposal" in saved_content
        assert b"CockroachDB" in saved_content

        # Verify session was created in DB
        assert mock_db_session.add.called
        added_session = mock_db_session.add.call_args[0][0]
        assert added_session.title == "Q3 Architecture Proposal"
        assert added_session.source_content_type == "document"
        assert added_session.document_file_path == "/media/1/gdoc_Q3_Architecture_Proposal.txt"

    @pytest.mark.asyncio
    async def test_google_docs_pipeline_requires_connection(
        self, app, mock_user, mock_db_session
    ):
        """Pipeline fails gracefully when Google is not connected."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_auth = AsyncMock()
        mock_auth.is_connected = AsyncMock(return_value=False)

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_auth):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/google/docs/import",
                    json={
                        "doc_id": "doc-123",
                        "title": "Some Doc",
                    },
                )

        assert response.status_code == 400
        assert "not connected" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_google_docs_full_processing_with_decisions(self, mock_db):
        """Test that a Google Doc imported session gets fully processed into decisions."""
        # This tests the MediaProcessor side - once a Google Doc is saved as a .txt file,
        # it follows the same document processing pipeline.

        mock_session = MagicMock()
        mock_session.id = 51
        mock_session.video_file_path = None
        mock_session.audio_file_path = None
        mock_session.document_file_path = "/media/1/gdoc_proposal.txt"
        mock_session.source_content_type = "document"
        mock_session.owner_id = 1
        mock_session.extraction_metadata = {
            "google_doc_id": "doc-abc123",
            "source": "google_docs",
        }

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = mock_result

        google_doc_content = (
            b"Design Review: API Gateway\n\n"
            b"We decided to use Kong as our API gateway.\n"
            b"Rate limiting will be set to 1000 req/min per client.\n"
        )

        extraction_json = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

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
            mock_storage.get_file = AsyncMock(return_value=google_doc_content)
            mock_ss.return_value = mock_storage

            from src.services.media_processor import MediaProcessor

            processor = MediaProcessor()
            result = await processor.process_session(mock_db, session_id=51, user_id=1)

        # Verify full extraction
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]
        assert len(result["decisions"]) == 2

        # Verify session status updated
        assert mock_session.processing_status == "completed"

        # Verify document content was read and parsed
        mock_storage.get_file.assert_called_once_with("/media/1/gdoc_proposal.txt")

        # Verify Gemini received the document text
        mock_gemini.generate_with_document_text.assert_called_once()
        call_kwargs = mock_gemini.generate_with_document_text.call_args.kwargs
        assert "Design Review: API Gateway" in call_kwargs["document_text"]

        # Verify decisions were created with correct source_type
        add_calls = [c for c in mock_db.add.call_args_list if hasattr(c[0][0], 'source_type')]
        assert len(add_calls) == 2
        for call in add_calls:
            assert call[0][0].source_type == "document"
