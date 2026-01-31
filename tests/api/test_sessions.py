"""Tests for session upload endpoints."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from src.api.sessions import router
from src.api.deps import get_current_user
from src.db import get_db


def _make_mock_user():
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.is_active = True
    return user


def _make_mock_session(
    session_id=1,
    title="Test Session",
    session_type="coding",
    processing_status="pending",
    source_content_type=None,
    audio_file_path=None,
    video_file_path=None,
    document_file_path=None,
):
    session = MagicMock()
    session.id = session_id
    session.title = title
    session.session_type = session_type
    session.summary = None
    session.processing_status = processing_status
    session.duration_seconds = None
    session.audio_file_path = audio_file_path
    session.video_file_path = video_file_path
    session.document_file_path = document_file_path
    session.source_content_type = source_content_type
    session.git_branch = None
    session.open_questions = []
    session.technologies_mentioned = []
    session.created_at = MagicMock()
    session.created_at.isoformat.return_value = "2025-01-01T00:00:00"
    return session


def _apply_session_attrs(target, source):
    """Copy mock session attributes onto the CodingSession after db.refresh."""
    target.id = source.id
    target.title = source.title
    target.session_type = source.session_type
    target.summary = source.summary
    target.processing_status = source.processing_status
    target.duration_seconds = source.duration_seconds
    target.audio_file_path = source.audio_file_path
    target.video_file_path = source.video_file_path
    target.document_file_path = source.document_file_path
    target.source_content_type = source.source_content_type
    target.git_branch = source.git_branch
    target.open_questions = source.open_questions
    target.technologies_mentioned = source.technologies_mentioned
    target.created_at = source.created_at


@asynccontextmanager
async def _mock_async_session_local():
    """Mock for AsyncSessionLocal context manager."""
    yield AsyncMock()


# Patch targets for background tasks (DB session + processor)
BG_PATCH_PROCESSOR = "src.api.sessions.get_media_processor"
BG_PATCH_DB = "src.db.AsyncSessionLocal"


@pytest.fixture
def app():
    """Create test FastAPI app with overridden dependencies."""
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


class TestUploadVideo:
    @pytest.mark.asyncio
    async def test_upload_video_valid_mp4(self, app, mock_user, mock_db_session):
        """Test uploading a valid MP4 video returns 200."""
        created_session = _make_mock_session(
            source_content_type="video",
            video_file_path="/media/1/video_test.mp4",
        )
        mock_db_session.refresh = AsyncMock(
            side_effect=lambda s: _apply_session_attrs(s, created_session)
        )

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_storage_service") as mock_storage_fn, \
             patch("src.api.sessions.get_settings") as mock_settings_fn, \
             patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            mock_storage = AsyncMock()
            mock_storage.save_file = AsyncMock(return_value="/media/1/video_test.mp4")
            mock_storage_fn.return_value = mock_storage

            mock_settings = MagicMock()
            mock_settings.max_video_size_mb = 500
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-video",
                    files={"video": ("test.mp4", b"fake video data", "video/mp4")},
                    data={"title": "Test Video Session", "session_type": "coding"},
                )

        assert response.status_code == 200
        data = response.json()
        assert data["source_content_type"] == "video"

    @pytest.mark.asyncio
    async def test_upload_video_invalid_mime_type(self, app, mock_user, mock_db_session):
        """Test uploading a non-video file returns 400."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_settings") as mock_settings_fn:
            mock_settings = MagicMock()
            mock_settings.max_video_size_mb = 500
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-video",
                    files={"video": ("test.txt", b"not a video", "text/plain")},
                    data={"title": "Bad Video"},
                )

        assert response.status_code == 400
        assert "Invalid video type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_video_too_large(self, app, mock_user, mock_db_session):
        """Test uploading an oversized video returns 400."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_settings") as mock_settings_fn:
            mock_settings = MagicMock()
            mock_settings.max_video_size_mb = 1
            mock_settings_fn.return_value = mock_settings

            large_data = b"x" * (2 * 1024 * 1024)
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-video",
                    files={"video": ("big.mp4", large_data, "video/mp4")},
                    data={"title": "Big Video"},
                )

        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()


class TestUploadDocument:
    @pytest.mark.asyncio
    async def test_upload_document_valid_pdf(self, app, mock_user, mock_db_session):
        """Test uploading a valid PDF returns 200."""
        created_session = _make_mock_session(
            source_content_type="document",
            document_file_path="/media/1/doc_test.pdf",
        )
        mock_db_session.refresh = AsyncMock(
            side_effect=lambda s: _apply_session_attrs(s, created_session)
        )

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_storage_service") as mock_storage_fn, \
             patch("src.api.sessions.get_settings") as mock_settings_fn, \
             patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            mock_storage = AsyncMock()
            mock_storage.save_file = AsyncMock(return_value="/media/1/doc_test.pdf")
            mock_storage_fn.return_value = mock_storage

            mock_settings = MagicMock()
            mock_settings.max_document_size_mb = 50
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": ("test.pdf", b"fake pdf", "application/pdf")},
                    data={"title": "Test Doc"},
                )

        assert response.status_code == 200
        data = response.json()
        assert data["source_content_type"] == "document"

    @pytest.mark.asyncio
    async def test_upload_document_valid_txt(self, app, mock_user, mock_db_session):
        """Test uploading a valid TXT file returns 200."""
        created_session = _make_mock_session(
            source_content_type="document",
            document_file_path="/media/1/doc_test.txt",
        )
        mock_db_session.refresh = AsyncMock(
            side_effect=lambda s: _apply_session_attrs(s, created_session)
        )

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_storage_service") as mock_storage_fn, \
             patch("src.api.sessions.get_settings") as mock_settings_fn, \
             patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            mock_storage = AsyncMock()
            mock_storage.save_file = AsyncMock(return_value="/media/1/doc_test.txt")
            mock_storage_fn.return_value = mock_storage

            mock_settings = MagicMock()
            mock_settings.max_document_size_mb = 50
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": ("test.txt", b"hello world", "text/plain")},
                    data={"title": "Text Doc"},
                )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_upload_document_valid_docx(self, app, mock_user, mock_db_session):
        """Test uploading a valid DOCX file returns 200."""
        created_session = _make_mock_session(
            source_content_type="document",
            document_file_path="/media/1/doc_test.docx",
        )
        mock_db_session.refresh = AsyncMock(
            side_effect=lambda s: _apply_session_attrs(s, created_session)
        )

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        with patch("src.api.sessions.get_storage_service") as mock_storage_fn, \
             patch("src.api.sessions.get_settings") as mock_settings_fn, \
             patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            mock_storage = AsyncMock()
            mock_storage.save_file = AsyncMock(return_value="/media/1/doc_test.docx")
            mock_storage_fn.return_value = mock_storage

            mock_settings = MagicMock()
            mock_settings.max_document_size_mb = 50
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": ("test.docx", b"fake docx", docx_mime)},
                    data={"title": "DOCX Doc"},
                )

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_upload_document_invalid_type(self, app, mock_user, mock_db_session):
        """Test uploading an unsupported document type returns 400."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_settings") as mock_settings_fn:
            mock_settings = MagicMock()
            mock_settings.max_document_size_mb = 50
            mock_settings_fn.return_value = mock_settings

            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": ("test.xlsx", b"data", "application/vnd.ms-excel")},
                    data={"title": "Bad Doc"},
                )

        assert response.status_code == 400
        assert "Invalid document type" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_upload_document_too_large(self, app, mock_user, mock_db_session):
        """Test uploading an oversized document returns 400."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_settings") as mock_settings_fn:
            mock_settings = MagicMock()
            mock_settings.max_document_size_mb = 1
            mock_settings_fn.return_value = mock_settings

            large_data = b"x" * (2 * 1024 * 1024)
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-document",
                    files={"document": ("big.pdf", large_data, "application/pdf")},
                    data={"title": "Big Doc"},
                )

        assert response.status_code == 400
        assert "too large" in response.json()["detail"].lower()


class TestSessionResponseFields:
    @pytest.mark.asyncio
    async def test_session_response_includes_new_fields(self, app, mock_user, mock_db_session):
        """Test that session response includes video/doc paths and source_content_type."""
        mock_session = _make_mock_session(
            source_content_type="video",
            video_file_path="/media/1/video.mp4",
            document_file_path=None,
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = mock_result

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/sessions/1")

        assert response.status_code == 200
        data = response.json()
        assert "video_file_path" in data
        assert "document_file_path" in data
        assert "source_content_type" in data
        assert data["source_content_type"] == "video"
        assert data["video_file_path"] == "/media/1/video.mp4"


class TestReprocess:
    @pytest.mark.asyncio
    async def test_reprocess_video_session(self, app, mock_user, mock_db_session):
        """Test reprocessing a video session."""
        mock_session = _make_mock_session(
            source_content_type="video",
            video_file_path="/media/1/video.mp4",
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = mock_result

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post("/sessions/1/reprocess")

        assert response.status_code == 200
        assert mock_session.processing_status == "pending"

    @pytest.mark.asyncio
    async def test_reprocess_document_session(self, app, mock_user, mock_db_session):
        """Test reprocessing a document session."""
        mock_session = _make_mock_session(
            source_content_type="document",
            document_file_path="/media/1/doc.pdf",
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db_session.execute.return_value = mock_result

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch(BG_PATCH_PROCESSOR, return_value=AsyncMock()), \
             patch(BG_PATCH_DB, side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post("/sessions/1/reprocess")

        assert response.status_code == 200
        assert mock_session.processing_status == "pending"
