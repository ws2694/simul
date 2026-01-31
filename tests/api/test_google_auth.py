"""Tests for Google OAuth API endpoints."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from contextlib import asynccontextmanager
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

from src.api.google_auth import router
from src.api.deps import get_current_user
from src.db import get_db


@asynccontextmanager
async def _mock_async_session_local():
    yield AsyncMock()


def _make_mock_user():
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.is_active = True
    return user


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


class TestConnect:
    @pytest.mark.asyncio
    async def test_connect_returns_auth_url(self, app, mock_user, mock_db_session):
        """Test that /connect returns an authorization URL."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_service = MagicMock()
        mock_service.get_authorization_url.return_value = (
            "https://accounts.google.com/o/oauth2/auth?client_id=test",
            "state-token",
        )

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_service):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/google/connect")

        assert response.status_code == 200
        data = response.json()
        assert "authorization_url" in data
        assert "accounts.google.com" in data["authorization_url"]
        assert "state" in data


class TestCallback:
    @pytest.mark.asyncio
    async def test_callback_stores_tokens(self, app, mock_user, mock_db_session):
        """Test that /callback exchanges code and returns connected status."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_service = AsyncMock()
        mock_service.exchange_code = AsyncMock(return_value=MagicMock())

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_service):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get(
                    "/google/callback",
                    params={"code": "auth-code-123", "state": "state-token"},
                )

        assert response.status_code == 200
        assert response.json()["status"] == "connected"
        mock_service.exchange_code.assert_called_once_with(
            "auth-code-123", mock_db_session, mock_user.id
        )


class TestStatus:
    @pytest.mark.asyncio
    async def test_status_when_connected(self, app, mock_user, mock_db_session):
        """Test status returns connected=true when tokens exist."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_service = AsyncMock()
        mock_service.is_connected = AsyncMock(return_value=True)

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_service):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/google/status")

        assert response.status_code == 200
        assert response.json()["connected"] is True

    @pytest.mark.asyncio
    async def test_status_when_disconnected(self, app, mock_user, mock_db_session):
        """Test status returns connected=false when no tokens."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_service = AsyncMock()
        mock_service.is_connected = AsyncMock(return_value=False)

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_service):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.get("/google/status")

        assert response.status_code == 200
        assert response.json()["connected"] is False


class TestImportGoogleDoc:
    @pytest.mark.asyncio
    async def test_import_google_doc_creates_session(self, app, mock_user, mock_db_session):
        """Test importing a Google Doc creates a session and starts processing."""
        mock_session = MagicMock()
        mock_session.id = 42
        mock_session.title = "Design Doc"
        mock_session.processing_status = "pending"
        mock_session.source_content_type = "document"

        def refresh_side_effect(s):
            s.id = 42
            s.title = "Design Doc"
            s.processing_status = "pending"
            s.source_content_type = "document"

        mock_db_session.refresh = AsyncMock(side_effect=refresh_side_effect)

        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_auth = AsyncMock()
        mock_auth.is_connected = AsyncMock(return_value=True)
        mock_auth.fetch_google_doc_text = AsyncMock(
            return_value="This is the document content"
        )

        mock_storage = AsyncMock()
        mock_storage.save_file = AsyncMock(return_value="/media/1/gdoc_design.txt")

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_auth), \
             patch("src.api.google_auth.get_storage_service", return_value=mock_storage), \
             patch("src.api.google_auth.get_media_processor", return_value=AsyncMock()), \
             patch("src.db.AsyncSessionLocal", side_effect=_mock_async_session_local):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/google/docs/import",
                    json={
                        "doc_id": "doc-123",
                        "title": "Design Doc",
                        "session_type": "design",
                    },
                )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Design Doc"
        assert data["source_content_type"] == "document"
        assert data["processing_status"] == "pending"

    @pytest.mark.asyncio
    async def test_import_requires_google_connection(self, app, mock_user, mock_db_session):
        """Test that import fails if Google is not connected."""
        app.dependency_overrides[get_current_user] = lambda: mock_user
        app.dependency_overrides[get_db] = lambda: mock_db_session

        mock_auth = AsyncMock()
        mock_auth.is_connected = AsyncMock(return_value=False)

        with patch("src.api.google_auth.get_google_auth_service", return_value=mock_auth):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                response = await client.post(
                    "/google/docs/import",
                    json={"doc_id": "doc-123", "title": "Doc"},
                )

        assert response.status_code == 400
        assert "not connected" in response.json()["detail"].lower()
