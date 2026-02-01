"""Integration tests for the video upload → processing → decision extraction pipeline."""
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


class TestVideoPipeline:
    @pytest.mark.asyncio
    async def test_upload_video_creates_session_and_extracts_decisions(
        self, app, mock_user, mock_db_session
    ):
        """Full flow: upload MP4 → session created → MediaProcessor processes → decisions extracted."""
        # Track all added objects to verify decisions were created
        added_objects = []
        original_add = mock_db_session.add

        def tracking_add(obj):
            added_objects.append(obj)
            return original_add(obj)

        mock_db_session.add = MagicMock(side_effect=tracking_add)

        # Mock the session object returned after DB refresh
        created_session = MagicMock()
        created_session.id = 10
        created_session.title = "Sprint Planning Recording"
        created_session.session_type = "meeting"
        created_session.summary = None
        created_session.processing_status = "pending"
        created_session.duration_seconds = None
        created_session.audio_file_path = None
        created_session.video_file_path = "/media/1/video_Sprint_Planning_Recording.mp4"
        created_session.document_file_path = None
        created_session.source_content_type = "video"
        created_session.git_branch = None
        created_session.open_questions = []
        created_session.technologies_mentioned = []
        created_session.created_at = datetime(2025, 7, 1, tzinfo=timezone.utc)

        def refresh_side_effect(obj):
            obj.id = created_session.id
            obj.title = created_session.title
            obj.processing_status = created_session.processing_status
            obj.video_file_path = created_session.video_file_path
            obj.source_content_type = created_session.source_content_type
            obj.created_at = created_session.created_at
            obj.open_questions = []
            obj.technologies_mentioned = []
            obj.audio_file_path = None
            obj.document_file_path = None
            obj.summary = None
            obj.duration_seconds = None
            obj.git_branch = None
            obj.session_type = "meeting"

        mock_db_session.refresh = AsyncMock(side_effect=refresh_side_effect)

        # Mock MediaProcessor that simulates full processing
        mock_processor = AsyncMock()

        async def mock_process(db, session_id, user_id):
            """Simulate the MediaProcessor processing a video session."""
            assert session_id == 10
            assert user_id == 1
            return SAMPLE_EXTRACTION_RESPONSE

        mock_processor.process_session = AsyncMock(side_effect=mock_process)

        # Mock storage
        mock_storage = AsyncMock()
        mock_storage.save_file = AsyncMock(
            return_value="/media/1/video_Sprint_Planning_Recording.mp4"
        )

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        with patch("src.api.sessions.get_storage_service", return_value=mock_storage), \
             patch("src.api.sessions.get_media_processor", return_value=mock_processor), \
             patch("src.db.AsyncSessionLocal", side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/sessions/upload-video",
                    files={"video": ("meeting.mp4", b"fake-video-data", "video/mp4")},
                    data={"title": "Sprint Planning Recording", "session_type": "meeting"},
                )

        # Verify upload response
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Sprint Planning Recording"
        assert data["source_content_type"] == "video"
        assert data["processing_status"] == "pending"
        assert data["video_file_path"] is not None

        # Verify storage was called
        mock_storage.save_file.assert_called_once()

    @pytest.mark.asyncio
    async def test_video_decisions_have_correct_source_type(self, mock_db):
        """Verify that decisions created from video processing have source_type='video'."""
        # Create a mock session
        mock_session = MagicMock()
        mock_session.id = 20
        mock_session.video_file_path = "/media/1/recording.mp4"
        mock_session.audio_file_path = None
        mock_session.document_file_path = None
        mock_session.source_content_type = "video"
        mock_session.owner_id = 1

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_session
        mock_db.execute.return_value = mock_result

        extraction_json = json.dumps(SAMPLE_EXTRACTION_RESPONSE)

        with patch("src.services.media_processor.get_gemini_client") as mock_gc, \
             patch("src.services.media_processor.get_embedding_service") as mock_es, \
             patch("src.services.media_processor.get_storage_service") as mock_ss:

            mock_gemini = AsyncMock()
            mock_gemini.upload_file = AsyncMock(return_value="gs://bucket/video.mp4")
            mock_gemini.generate_with_video = AsyncMock(return_value=extraction_json)
            mock_gc.return_value = mock_gemini

            mock_embed = AsyncMock()
            mock_embed.generate_embedding = AsyncMock(return_value=[0.1] * 768)
            mock_es.return_value = mock_embed

            mock_storage = AsyncMock()
            mock_ss.return_value = mock_storage

            from src.services.media_processor import MediaProcessor

            processor = MediaProcessor()
            result = await processor.process_session(mock_db, session_id=20, user_id=1)

        # Verify decisions were added with source_type="video"
        assert result["summary"] == SAMPLE_EXTRACTION_RESPONSE["summary"]
        assert len(result["decisions"]) == 2

        # Check all db.add calls for Decision objects
        add_calls = mock_db.add.call_args_list
        decision_adds = [
            call for call in add_calls
            if hasattr(call[0][0], 'source_type')
        ]
        assert len(decision_adds) == 2
        for call in decision_adds:
            decision = call[0][0]
            assert decision.source_type == "video"

        # Verify Gemini was called with video-specific method
        mock_gemini.generate_with_video.assert_called_once()
        mock_gemini.upload_file.assert_called_once_with("/media/1/recording.mp4")
