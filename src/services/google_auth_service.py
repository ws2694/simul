"""Google OAuth and Drive/Docs integration service."""
import structlog
from datetime import datetime, timezone
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from src.config import get_settings
from src.models.google_auth import GoogleOAuthToken

logger = structlog.get_logger()

SCOPES = [
    "https://www.googleapis.com/auth/drive.readonly",
    "https://www.googleapis.com/auth/documents.readonly",
]


class GoogleAuthService:
    """Service for Google OAuth2 flow and Drive/Docs API access."""

    def __init__(self):
        settings = get_settings()
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = settings.google_redirect_uri

    def get_authorization_url(self, state: str) -> tuple[str, str]:
        """Build OAuth2 authorization URL.

        Returns:
            Tuple of (authorization_url, state).
        """
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=self.redirect_uri,
        )
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true",
            state=state,
            prompt="consent",
        )
        return authorization_url, state

    async def exchange_code(
        self, code: str, db: AsyncSession, user_id: int
    ) -> GoogleOAuthToken:
        """Exchange authorization code for tokens and store them.

        Args:
            code: Authorization code from OAuth callback.
            db: Database session.
            user_id: User ID to associate tokens with.

        Returns:
            The stored GoogleOAuthToken.
        """
        from google_auth_oauthlib.flow import Flow

        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=SCOPES,
            redirect_uri=self.redirect_uri,
        )
        flow.fetch_token(code=code)
        credentials = flow.credentials

        # Upsert token record
        result = await db.execute(
            select(GoogleOAuthToken).where(GoogleOAuthToken.user_id == user_id)
        )
        existing = result.scalar_one_or_none()

        if existing:
            existing.access_token = credentials.token
            existing.refresh_token = credentials.refresh_token or existing.refresh_token
            existing.token_type = "Bearer"
            existing.expires_at = credentials.expiry
            existing.scopes = " ".join(credentials.scopes or SCOPES)
            token = existing
        else:
            token = GoogleOAuthToken(
                user_id=user_id,
                access_token=credentials.token,
                refresh_token=credentials.refresh_token,
                token_type="Bearer",
                expires_at=credentials.expiry,
                scopes=" ".join(credentials.scopes or SCOPES),
            )
            db.add(token)

        await db.commit()
        await db.refresh(token)

        logger.info("Google OAuth tokens stored", user_id=user_id)
        return token

    async def get_credentials(
        self, db: AsyncSession, user_id: int
    ):
        """Load OAuth credentials from DB, refreshing if expired.

        Returns:
            google.oauth2.credentials.Credentials or None if not connected.
        """
        from google.oauth2.credentials import Credentials

        result = await db.execute(
            select(GoogleOAuthToken).where(GoogleOAuthToken.user_id == user_id)
        )
        token = result.scalar_one_or_none()

        if not token:
            return None

        credentials = Credentials(
            token=token.access_token,
            refresh_token=token.refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=token.scopes.split(" "),
        )

        # Set expiry if we have it
        if token.expires_at:
            credentials.expiry = token.expires_at.replace(tzinfo=None)

        # Refresh if expired
        if credentials.expired and credentials.refresh_token:
            import google.auth.transport.requests
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)

            # Update stored token
            token.access_token = credentials.token
            if credentials.expiry:
                token.expires_at = credentials.expiry.replace(
                    tzinfo=timezone.utc
                )
            await db.commit()

        return credentials

    async def disconnect(self, db: AsyncSession, user_id: int) -> None:
        """Remove stored OAuth tokens for a user."""
        await db.execute(
            delete(GoogleOAuthToken).where(GoogleOAuthToken.user_id == user_id)
        )
        await db.commit()
        logger.info("Google OAuth disconnected", user_id=user_id)

    async def is_connected(self, db: AsyncSession, user_id: int) -> bool:
        """Check if user has stored Google OAuth tokens."""
        result = await db.execute(
            select(GoogleOAuthToken.id).where(GoogleOAuthToken.user_id == user_id)
        )
        return result.scalar_one_or_none() is not None

    async def fetch_google_doc_text(
        self, db: AsyncSession, user_id: int, doc_id: str
    ) -> str:
        """Fetch a Google Doc and extract its plain text content.

        Args:
            db: Database session.
            user_id: User ID for credentials.
            doc_id: Google Docs document ID.

        Returns:
            Plain text content of the document.

        Raises:
            ValueError: If not connected or doc cannot be fetched.
        """
        from googleapiclient.discovery import build

        credentials = await self.get_credentials(db, user_id)
        if not credentials:
            raise ValueError("Google account not connected")

        service = build("docs", "v1", credentials=credentials)
        document = service.documents().get(documentId=doc_id).execute()

        # Extract text from document body
        text_parts = []
        body = document.get("body", {})
        for element in body.get("content", []):
            paragraph = element.get("paragraph")
            if paragraph:
                for text_elem in paragraph.get("elements", []):
                    text_run = text_elem.get("textRun")
                    if text_run:
                        text_parts.append(text_run.get("content", ""))

        return "".join(text_parts)

    async def list_drive_files(
        self, db: AsyncSession, user_id: int, query: str | None = None
    ) -> list[dict]:
        """List Google Docs from the user's Drive.

        Args:
            db: Database session.
            user_id: User ID for credentials.
            query: Optional name filter.

        Returns:
            List of file metadata dicts with id, name, modifiedTime, owners.
        """
        from googleapiclient.discovery import build

        credentials = await self.get_credentials(db, user_id)
        if not credentials:
            raise ValueError("Google account not connected")

        service = build("drive", "v3", credentials=credentials)

        # Build query for Google Docs only
        q = "mimeType='application/vnd.google-apps.document'"
        if query:
            q += f" and name contains '{query}'"

        results = (
            service.files()
            .list(
                q=q,
                pageSize=50,
                fields="files(id, name, modifiedTime, owners)",
                orderBy="modifiedTime desc",
            )
            .execute()
        )

        files = results.get("files", [])
        return [
            {
                "id": f["id"],
                "name": f["name"],
                "modified_time": f.get("modifiedTime"),
                "owners": [
                    o.get("displayName", o.get("emailAddress", ""))
                    for o in f.get("owners", [])
                ],
            }
            for f in files
        ]


@lru_cache
def get_google_auth_service() -> GoogleAuthService:
    """Get Google auth service singleton."""
    return GoogleAuthService()
