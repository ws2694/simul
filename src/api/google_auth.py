"""Google OAuth and Drive/Docs integration endpoints."""
import secrets
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from src.api.deps import CurrentUser, DbSession
from src.models import CodingSession, SessionType
from src.services.google_auth_service import get_google_auth_service
from src.services.media_processor import get_media_processor
from src.services.storage_service import get_storage_service

router = APIRouter()


class AuthUrlResponse(BaseModel):
    authorization_url: str
    state: str


class ConnectionStatus(BaseModel):
    connected: bool


class DriveFile(BaseModel):
    id: str
    name: str
    modified_time: str | None
    owners: list[str]


class ImportDocRequest(BaseModel):
    doc_id: str
    title: str
    session_type: SessionType = SessionType.DESIGN
    git_branch: str | None = None


class ImportDocResponse(BaseModel):
    id: int
    title: str
    processing_status: str
    source_content_type: str


@router.get("/connect", response_model=AuthUrlResponse)
async def google_connect(
    current_user: CurrentUser,
) -> AuthUrlResponse:
    """Get Google OAuth authorization URL."""
    service = get_google_auth_service()
    state = secrets.token_urlsafe(32)
    authorization_url, state = service.get_authorization_url(state)
    return AuthUrlResponse(authorization_url=authorization_url, state=state)


@router.get("/callback")
async def google_callback(
    code: str,
    state: str,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Handle Google OAuth callback and store tokens."""
    try:
        service = get_google_auth_service()
        await service.exchange_code(code, db, current_user.id)
        return {"status": "connected"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth callback failed: {str(e)}")


@router.get("/status", response_model=ConnectionStatus)
async def google_status(
    current_user: CurrentUser,
    db: DbSession,
) -> ConnectionStatus:
    """Check if user has connected their Google account."""
    service = get_google_auth_service()
    connected = await service.is_connected(db, current_user.id)
    return ConnectionStatus(connected=connected)


@router.delete("/disconnect")
async def google_disconnect(
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Remove stored Google OAuth tokens."""
    service = get_google_auth_service()
    await service.disconnect(db, current_user.id)
    return {"status": "disconnected"}


@router.get("/drive/files", response_model=list[DriveFile])
async def list_drive_files(
    current_user: CurrentUser,
    db: DbSession,
    query: str | None = None,
) -> list[DriveFile]:
    """List Google Docs from the user's Drive."""
    service = get_google_auth_service()
    try:
        files = await service.list_drive_files(db, current_user.id, query)
        return [DriveFile(**f) for f in files]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/docs/import", response_model=ImportDocResponse)
async def import_google_doc(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    request: ImportDocRequest,
) -> ImportDocResponse:
    """Import a Google Doc, save as file, and process for decisions."""
    auth_service = get_google_auth_service()

    # Check connection
    connected = await auth_service.is_connected(db, current_user.id)
    if not connected:
        raise HTTPException(
            status_code=400,
            detail="Google account not connected. Connect via /google/connect first.",
        )

    # Fetch document text
    try:
        doc_text = await auth_service.fetch_google_doc_text(
            db, current_user.id, request.doc_id
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch document: {str(e)}")

    if not doc_text.strip():
        raise HTTPException(status_code=400, detail="Document is empty")

    # Save as text file
    storage = get_storage_service()
    filename = f"gdoc_{request.title.replace(' ', '_')[:50]}.txt"
    file_data = doc_text.encode("utf-8")
    file_path = await storage.save_file(file_data, filename, current_user.id)

    # Create session
    session = CodingSession(
        title=request.title,
        session_type=request.session_type,
        document_file_path=file_path,
        source_content_type="document",
        git_branch=request.git_branch,
        owner_id=current_user.id,
        processing_status="pending",
        extraction_metadata={
            "google_doc_id": request.doc_id,
            "source": "google_docs",
        },
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Schedule background processing
    session_id = session.id
    user_id = current_user.id

    async def process_session():
        from src.db import AsyncSessionLocal

        async with AsyncSessionLocal() as process_db:
            processor = get_media_processor()
            try:
                await processor.process_session(process_db, session_id, user_id)
            except Exception:
                pass

    background_tasks.add_task(process_session)

    return ImportDocResponse(
        id=session.id,
        title=session.title,
        processing_status=session.processing_status,
        source_content_type="document",
    )
