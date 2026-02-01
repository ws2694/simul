"""Unified media processing service for audio, video, and document sources."""
import json
import structlog
from functools import lru_cache
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import Decision, CodingSession, DecisionStatus, VisibilityLevel
from src.services.gemini_client import get_gemini_client
from src.services.embedding_service import get_embedding_service
from src.services.storage_service import get_storage_service
from src.services.document_parser import parse_document
from src.services.extraction_prompts import (
    EXTRACTION_SCHEMA,
    AUDIO_EXTRACTION_PROMPT,
    VIDEO_EXTRACTION_PROMPT,
    DOCUMENT_EXTRACTION_PROMPT,
)

logger = structlog.get_logger()

# MIME type mappings
AUDIO_MIME_TYPES = {
    "mp3": "audio/mp3",
    "wav": "audio/wav",
    "m4a": "audio/mp4",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "flac": "audio/flac",
    "webm": "audio/webm",
}

VIDEO_MIME_TYPES = {
    "mp4": "video/mp4",
    "webm": "video/webm",
    "mov": "video/quicktime",
    "avi": "video/x-msvideo",
    "mpeg": "video/mpeg",
    "mpg": "video/mpeg",
}


class MediaProcessor:
    """Unified processor for audio, video, and document sessions."""

    def __init__(self):
        self.gemini = get_gemini_client()
        self.embeddings = get_embedding_service()
        self.storage = get_storage_service()

    async def process_session(
        self,
        db: AsyncSession,
        session_id: int,
        user_id: int,
    ) -> dict:
        """Process a session by routing to the appropriate handler based on source_content_type."""
        result = await db.execute(
            select(CodingSession).where(
                CodingSession.id == session_id, CodingSession.owner_id == user_id
            )
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session {session_id} not found")

        source_type = session.source_content_type or "audio"

        # Update status
        session.processing_status = "processing"
        await db.commit()

        try:
            if source_type == "audio":
                extraction = await self._process_audio(session)
            elif source_type == "video":
                extraction = await self._process_video(session)
            elif source_type == "document":
                extraction = await self._process_document(session)
            else:
                raise ValueError(f"Unknown source content type: {source_type}")

            await self._save_extraction(db, session, extraction, source_type, user_id)

            logger.info(
                "Session processed via MediaProcessor",
                session_id=session_id,
                source_type=source_type,
                decisions_extracted=len(extraction.get("decisions", [])),
            )

            return extraction

        except Exception as e:
            session.processing_status = "failed"
            session.extraction_metadata = {"error": str(e)}
            await db.commit()
            logger.error(
                "Session processing failed",
                session_id=session_id,
                source_type=source_type,
                error=str(e),
            )
            raise

    async def _process_audio(self, session: CodingSession) -> dict:
        """Process an audio session."""
        if not session.audio_file_path:
            raise ValueError(f"Session {session.id} has no audio file")

        audio_uri = await self.gemini.upload_file(session.audio_file_path)

        ext = session.audio_file_path.lower().split(".")[-1]
        mime_type = AUDIO_MIME_TYPES.get(ext, "audio/mp3")

        response = await self.gemini.generate_with_audio(
            audio_uri=audio_uri,
            mime_type=mime_type,
            prompt=AUDIO_EXTRACTION_PROMPT,
            response_schema=EXTRACTION_SCHEMA,
            thinking_level="high",
        )

        return json.loads(response)

    async def _process_video(self, session: CodingSession) -> dict:
        """Process a video session."""
        if not session.video_file_path:
            raise ValueError(f"Session {session.id} has no video file")

        video_uri = await self.gemini.upload_file(session.video_file_path)

        ext = session.video_file_path.lower().split(".")[-1]
        mime_type = VIDEO_MIME_TYPES.get(ext, "video/mp4")

        response = await self.gemini.generate_with_video(
            video_uri=video_uri,
            mime_type=mime_type,
            prompt=VIDEO_EXTRACTION_PROMPT,
            response_schema=EXTRACTION_SCHEMA,
            thinking_level="high",
        )

        return json.loads(response)

    async def _process_document(self, session: CodingSession) -> dict:
        """Process a document session."""
        if not session.document_file_path:
            raise ValueError(f"Session {session.id} has no document file")

        file_bytes = await self.storage.get_file(session.document_file_path)

        ext = session.document_file_path.lower().split(".")[-1]
        document_text = parse_document(file_bytes, ext)

        if not document_text.strip():
            raise ValueError("Document is empty or could not be parsed")

        response = await self.gemini.generate_with_document_text(
            document_text=document_text,
            prompt=DOCUMENT_EXTRACTION_PROMPT,
            response_schema=EXTRACTION_SCHEMA,
            thinking_level="high",
        )

        return json.loads(response)

    async def _save_extraction(
        self,
        db: AsyncSession,
        session: CodingSession,
        extraction: dict,
        source_type: str,
        user_id: int,
    ) -> None:
        """Save extraction results to session and create Decision records."""
        session.summary = extraction.get("summary", "")
        session.open_questions = extraction.get("open_questions", [])
        session.technologies_mentioned = extraction.get("technologies_mentioned", [])
        session.processing_status = "completed"

        for dec in extraction.get("decisions", []):
            embedding_text = f"{dec['decision']} {dec.get('reasoning', '')}"
            embedding = await self.embeddings.generate_embedding(embedding_text)

            decision = Decision(
                title=dec["decision"][:500],
                decision_text=dec["decision"],
                reasoning=dec.get("reasoning", ""),
                alternatives_considered=dec.get("alternatives_considered", []),
                confidence=dec.get("confidence", 0.5),
                domain=dec.get("domain", "general"),
                tags=dec.get("tags", []),
                status=DecisionStatus.ACTIVE,
                source_type=source_type,
                source_timestamp_start=dec.get("timestamp_start", 0),
                source_timestamp_end=dec.get("timestamp_end", 0),
                visibility=VisibilityLevel.PRIVATE,
                embedding=embedding,
                owner_id=user_id,
                session_id=session.id,
            )
            db.add(decision)

        await db.commit()


# Singleton
_media_processor: MediaProcessor | None = None


def get_media_processor() -> MediaProcessor:
    """Get media processor singleton."""
    global _media_processor
    if _media_processor is None:
        _media_processor = MediaProcessor()
    return _media_processor
