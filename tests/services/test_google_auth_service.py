"""Tests for Google Auth Service."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, PropertyMock
from datetime import datetime, timezone, timedelta


class TestGetAuthorizationUrl:
    def test_get_authorization_url_returns_valid_url(self):
        """Test that get_authorization_url returns a valid Google OAuth URL."""
        mock_flow = MagicMock()
        mock_flow.authorization_url.return_value = (
            "https://accounts.google.com/o/oauth2/auth?client_id=test",
            "test-state",
        )

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-client-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost:3000/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        with patch(
            "src.services.google_auth_service.GoogleAuthService.get_authorization_url"
        ) as mock_method:
            mock_method.return_value = (
                "https://accounts.google.com/o/oauth2/auth?client_id=test",
                "test-state",
            )
            url, state = service.get_authorization_url("test-state")

        assert "accounts.google.com" in url
        assert state == "test-state"


class TestExchangeCode:
    @pytest.mark.asyncio
    async def test_exchange_code_stores_new_tokens(self, mock_db):
        """Test that exchanging a code stores new tokens."""
        mock_credentials = MagicMock()
        mock_credentials.token = "access-token-123"
        mock_credentials.refresh_token = "refresh-token-456"
        mock_credentials.expiry = datetime(2025, 12, 31, tzinfo=timezone.utc)
        mock_credentials.scopes = ["https://www.googleapis.com/auth/drive.readonly"]

        mock_flow = MagicMock()
        mock_flow.credentials = mock_credentials

        # No existing token
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        with patch(
            "google_auth_oauthlib.flow.Flow.from_client_config",
            return_value=mock_flow,
        ):
            token = await service.exchange_code("auth-code", mock_db, user_id=1)

        mock_db.add.assert_called_once()
        mock_db.commit.assert_called()

    @pytest.mark.asyncio
    async def test_exchange_code_updates_existing_tokens(self, mock_db):
        """Test that exchanging a code updates existing tokens."""
        mock_credentials = MagicMock()
        mock_credentials.token = "new-access-token"
        mock_credentials.refresh_token = "new-refresh-token"
        mock_credentials.expiry = datetime(2025, 12, 31, tzinfo=timezone.utc)
        mock_credentials.scopes = ["https://www.googleapis.com/auth/drive.readonly"]

        mock_flow = MagicMock()
        mock_flow.credentials = mock_credentials

        # Existing token
        existing_token = MagicMock()
        existing_token.access_token = "old-token"
        existing_token.refresh_token = "old-refresh"
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = existing_token
        mock_db.execute.return_value = mock_result

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        with patch(
            "google_auth_oauthlib.flow.Flow.from_client_config",
            return_value=mock_flow,
        ):
            await service.exchange_code("auth-code", mock_db, user_id=1)

        # Should update existing, not add new
        mock_db.add.assert_not_called()
        assert existing_token.access_token == "new-access-token"


class TestGetCredentials:
    @pytest.mark.asyncio
    async def test_get_credentials_returns_none_when_disconnected(self, mock_db):
        """Test that get_credentials returns None when no tokens stored."""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        creds = await service.get_credentials(mock_db, user_id=1)
        assert creds is None

    @pytest.mark.asyncio
    async def test_get_credentials_refreshes_expired_token(self, mock_db):
        """Test that expired tokens are refreshed."""
        expired_token = MagicMock()
        expired_token.access_token = "expired-token"
        expired_token.refresh_token = "valid-refresh"
        expired_token.token_type = "Bearer"
        expired_token.expires_at = datetime(2020, 1, 1, tzinfo=timezone.utc)
        expired_token.scopes = "https://www.googleapis.com/auth/drive.readonly"

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = expired_token
        mock_db.execute.return_value = mock_result

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        mock_creds_instance = MagicMock()
        mock_creds_instance.expired = True
        mock_creds_instance.refresh_token = "valid-refresh"
        mock_creds_instance.token = "new-token-after-refresh"
        mock_creds_instance.expiry = datetime(2026, 1, 1)

        with patch("google.oauth2.credentials.Credentials", return_value=mock_creds_instance), \
             patch("google.auth.transport.requests.Request"):
            creds = await service.get_credentials(mock_db, user_id=1)

        mock_creds_instance.refresh.assert_called_once()
        mock_db.commit.assert_called()


class TestFetchGoogleDoc:
    @pytest.mark.asyncio
    async def test_fetch_google_doc_text_extracts_content(self, mock_db):
        """Test extracting text from a Google Doc via the API."""
        mock_doc = {
            "body": {
                "content": [
                    {
                        "paragraph": {
                            "elements": [
                                {"textRun": {"content": "Hello "}},
                                {"textRun": {"content": "World\n"}},
                            ]
                        }
                    },
                    {
                        "paragraph": {
                            "elements": [
                                {"textRun": {"content": "Second paragraph\n"}},
                            ]
                        }
                    },
                ]
            }
        }

        mock_service = MagicMock()
        mock_service.documents().get().execute.return_value = mock_doc

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        mock_creds = MagicMock()

        with patch.object(service, "get_credentials", return_value=mock_creds), \
             patch("googleapiclient.discovery.build", return_value=mock_service):
            text = await service.fetch_google_doc_text(mock_db, user_id=1, doc_id="doc-123")

        assert "Hello " in text
        assert "World" in text
        assert "Second paragraph" in text


class TestListDriveFiles:
    @pytest.mark.asyncio
    async def test_list_drive_files_returns_docs(self, mock_db):
        """Test listing Google Docs from Drive."""
        mock_files = {
            "files": [
                {
                    "id": "doc-1",
                    "name": "Design Doc",
                    "modifiedTime": "2025-01-01T00:00:00Z",
                    "owners": [{"displayName": "Test User"}],
                },
                {
                    "id": "doc-2",
                    "name": "Meeting Notes",
                    "modifiedTime": "2025-01-02T00:00:00Z",
                    "owners": [{"emailAddress": "test@example.com"}],
                },
            ]
        }

        mock_service = MagicMock()
        mock_service.files().list().execute.return_value = mock_files

        with patch("src.services.google_auth_service.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                google_client_id="test-id",
                google_client_secret="test-secret",
                google_redirect_uri="http://localhost/callback",
            )
            from src.services.google_auth_service import GoogleAuthService
            service = GoogleAuthService()

        mock_creds = MagicMock()

        with patch.object(service, "get_credentials", return_value=mock_creds), \
             patch("googleapiclient.discovery.build", return_value=mock_service):
            files = await service.list_drive_files(mock_db, user_id=1)

        assert len(files) == 2
        assert files[0]["id"] == "doc-1"
        assert files[0]["name"] == "Design Doc"
        assert files[1]["owners"] == ["test@example.com"]
