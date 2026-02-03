"""Coding session management endpoints."""
import re
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.deps import CurrentUser, DbSession
from src.config import get_settings
from src.models import CodingSession, SessionType
from src.services.audio_processor import get_audio_processor
from src.services.media_processor import get_media_processor
from src.services.storage_service import get_storage_service


def sanitize_filename(title: str) -> str:
    """Sanitize title for use in filename - ASCII only, no special chars."""
    # Replace non-ASCII with empty string, keep alphanumeric and underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_-]', '', title.replace(' ', '_'))
    # If nothing left after sanitization, use a UUID
    if not sanitized:
        sanitized = str(uuid.uuid4())[:8]
    return sanitized[:50]

router = APIRouter()


class SessionCreate(BaseModel):
    title: str
    session_type: SessionType = SessionType.CODING
    git_branch: str | None = None
    git_commit_start: str | None = None


class SessionResponse(BaseModel):
    id: int
    title: str
    session_type: SessionType
    summary: str | None
    processing_status: str
    duration_seconds: int | None
    audio_file_path: str | None
    video_file_path: str | None
    document_file_path: str | None
    source_content_type: str | None
    git_branch: str | None
    open_questions: list
    technologies_mentioned: list
    created_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_dates(cls, obj: CodingSession) -> "SessionResponse":
        return cls(
            id=obj.id,
            title=obj.title,
            session_type=obj.session_type,
            summary=obj.summary,
            processing_status=obj.processing_status,
            duration_seconds=obj.duration_seconds,
            audio_file_path=obj.audio_file_path,
            video_file_path=obj.video_file_path,
            document_file_path=obj.document_file_path,
            source_content_type=obj.source_content_type,
            git_branch=obj.git_branch,
            open_questions=obj.open_questions,
            technologies_mentioned=obj.technologies_mentioned,
            created_at=obj.created_at.isoformat(),
        )


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
    total: int


@router.post("/", response_model=SessionResponse)
async def create_session(
    current_user: CurrentUser,
    db: DbSession,
    session_data: SessionCreate,
) -> SessionResponse:
    """Create a new coding session (without audio yet)."""
    session = CodingSession(
        title=session_data.title,
        session_type=session_data.session_type,
        git_branch=session_data.git_branch,
        git_commit_start=session_data.git_commit_start,
        owner_id=current_user.id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return SessionResponse.from_orm_with_dates(session)


@router.post("/upload", response_model=SessionResponse)
async def upload_session_audio(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    audio: UploadFile = File(...),
    title: str = Form(...),
    session_type: SessionType = Form(SessionType.CODING),
    git_branch: str | None = Form(None),
    git_commit_start: str | None = Form(None),
    git_commit_end: str | None = Form(None),
) -> SessionResponse:
    """Upload audio and create a new session with automatic processing."""
    # Validate file type
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/mp4", "audio/m4a",
                     "audio/aac", "audio/ogg", "audio/flac", "audio/webm"]
    content_type = audio.content_type.split(";")[0] if audio.content_type else ""  # Handle "audio/webm;codecs=opus"
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid audio type. Allowed: {allowed_types}",
        )

    # Read and save file
    storage = get_storage_service()
    audio_data = await audio.read()

    ext = audio.filename.split(".")[-1] if audio.filename else "mp3"
    filename = f"session_{sanitize_filename(title)}.{ext}"
    file_path = await storage.save_file(audio_data, filename, current_user.id)

    # Create session
    session = CodingSession(
        title=title,
        session_type=session_type,
        audio_file_path=file_path,
        git_branch=git_branch,
        git_commit_start=git_commit_start,
        git_commit_end=git_commit_end,
        owner_id=current_user.id,
        processing_status="pending",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Schedule background processing
    async def process_session():
        from src.db import AsyncSessionLocal

        async with AsyncSessionLocal() as process_db:
            processor = get_audio_processor()
            try:
                await processor.process_session(process_db, session.id, current_user.id)
            except Exception as e:
                # Error handling is done in process_session
                pass

    background_tasks.add_task(process_session)

    return SessionResponse.from_orm_with_dates(session)


@router.post("/upload-video", response_model=SessionResponse)
async def upload_session_video(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    video: UploadFile = File(...),
    title: str = Form(...),
    session_type: SessionType = Form(SessionType.CODING),
    git_branch: str | None = Form(None),
) -> SessionResponse:
    """Upload a video and create a new session with automatic processing."""
    settings = get_settings()

    # Validate file type
    allowed_types = [
        "video/mp4", "video/webm", "video/quicktime",
        "video/x-msvideo", "video/mpeg",
    ]
    content_type = video.content_type.split(";")[0] if video.content_type else ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid video type. Allowed: {allowed_types}",
        )

    # Read and validate file size
    video_data = await video.read()
    max_bytes = settings.max_video_size_mb * 1024 * 1024
    if len(video_data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Video too large. Maximum size: {settings.max_video_size_mb}MB",
        )

    # Save file
    storage = get_storage_service()
    ext = video.filename.split(".")[-1] if video.filename else "mp4"
    filename = f"video_{sanitize_filename(title)}.{ext}"
    file_path = await storage.save_file(video_data, filename, current_user.id)

    # Create session
    session = CodingSession(
        title=title,
        session_type=session_type,
        video_file_path=file_path,
        source_content_type="video",
        git_branch=git_branch,
        owner_id=current_user.id,
        processing_status="pending",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Schedule background processing
    async def process_session():
        from src.db import AsyncSessionLocal

        async with AsyncSessionLocal() as process_db:
            processor = get_media_processor()
            try:
                await processor.process_session(process_db, session.id, current_user.id)
            except Exception:
                pass

    background_tasks.add_task(process_session)

    return SessionResponse.from_orm_with_dates(session)


@router.post("/upload-document", response_model=SessionResponse)
async def upload_session_document(
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
    document: UploadFile = File(...),
    title: str = Form(...),
    session_type: SessionType = Form(SessionType.DESIGN),
    git_branch: str | None = Form(None),
) -> SessionResponse:
    """Upload a document and create a new session with automatic processing."""
    settings = get_settings()

    # Validate file type
    allowed_types = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    content_type = document.content_type.split(";")[0] if document.content_type else ""
    if content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid document type. Allowed: PDF, TXT, DOCX",
        )

    # Read and validate file size
    doc_data = await document.read()
    max_bytes = settings.max_document_size_mb * 1024 * 1024
    if len(doc_data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Document too large. Maximum size: {settings.max_document_size_mb}MB",
        )

    # Save file
    storage = get_storage_service()
    ext = document.filename.split(".")[-1] if document.filename else "pdf"
    filename = f"doc_{sanitize_filename(title)}.{ext}"
    file_path = await storage.save_file(doc_data, filename, current_user.id)

    # Create session
    session = CodingSession(
        title=title,
        session_type=session_type,
        document_file_path=file_path,
        source_content_type="document",
        git_branch=git_branch,
        owner_id=current_user.id,
        processing_status="pending",
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)

    # Schedule background processing
    async def process_session():
        from src.db import AsyncSessionLocal

        async with AsyncSessionLocal() as process_db:
            processor = get_media_processor()
            try:
                await processor.process_session(process_db, session.id, current_user.id)
            except Exception:
                pass

    background_tasks.add_task(process_session)

    return SessionResponse.from_orm_with_dates(session)


@router.get("/", response_model=SessionListResponse)
async def list_sessions(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = 0,
    limit: int = 20,
) -> dict:
    """List all sessions for the current user."""
    result = await db.execute(
        select(CodingSession)
        .where(CodingSession.owner_id == current_user.id)
        .order_by(CodingSession.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    sessions = result.scalars().all()

    # Get total count
    count_result = await db.execute(
        select(CodingSession).where(CodingSession.owner_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    return {
        "sessions": [SessionResponse.from_orm_with_dates(s) for s in sessions],
        "total": total,
    }


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionResponse:
    """Get a specific session."""
    result = await db.execute(
        select(CodingSession)
        .options(selectinload(CodingSession.decisions))
        .where(CodingSession.id == session_id)
        .where(CodingSession.owner_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionResponse.from_orm_with_dates(session)


@router.post("/{session_id}/reprocess", response_model=SessionResponse)
async def reprocess_session(
    session_id: int,
    current_user: CurrentUser,
    db: DbSession,
    background_tasks: BackgroundTasks,
) -> SessionResponse:
    """Reprocess a session to extract decisions again."""
    result = await db.execute(
        select(CodingSession)
        .where(CodingSession.id == session_id)
        .where(CodingSession.owner_id == current_user.id)
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not (session.audio_file_path or session.video_file_path or session.document_file_path):
        raise HTTPException(status_code=400, detail="Session has no media file")

    session.processing_status = "pending"
    await db.commit()

    # Schedule background processing using unified MediaProcessor
    async def process_session():
        from src.db import AsyncSessionLocal

        async with AsyncSessionLocal() as process_db:
            processor = get_media_processor()
            try:
                await processor.process_session(process_db, session_id, current_user.id)
            except Exception:
                pass

    background_tasks.add_task(process_session)

    return SessionResponse.from_orm_with_dates(session)
