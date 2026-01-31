"""Audio processing service for extracting reasoning from recordings."""
import json
import structlog
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.models import Decision, CodingSession, DecisionStatus, VisibilityLevel
from src.services.gemini_client import get_gemini_client
from src.services.embedding_service import get_embedding_service
from src.services.storage_service import get_storage_service
from src.services.extraction_prompts import EXTRACTION_SCHEMA, AUDIO_EXTRACTION_PROMPT

logger = structlog.get_logger()


class ExtractedDecision(BaseModel):
    """A decision extracted from audio."""

    decision: str
    reasoning: str
    alternatives_considered: list[str]
    confidence: float
    timestamp_start: float
    timestamp_end: float
    domain: str
    tags: list[str]


class SessionExtraction(BaseModel):
    """Full extraction from a coding session."""

    summary: str
    decisions: list[ExtractedDecision]
    open_questions: list[str]
    technologies_mentioned: list[str]


class AudioProcessor:
    """Process audio recordings to extract reasoning."""

    def __init__(self):
        self.gemini = get_gemini_client()
        self.embeddings = get_embedding_service()
        self.storage = get_storage_service()

    async def process_session(
        self,
        db: AsyncSession,
        session_id: int,
        user_id: int,
    ) -> SessionExtraction:
        """Process a coding session and extract decisions."""
        # Get session from database
        result = await db.execute(
            select(CodingSession).where(
                CodingSession.id == session_id, CodingSession.owner_id == user_id
            )
        )
        session = result.scalar_one_or_none()

        if not session:
            raise ValueError(f"Session {session_id} not found")

        if not session.audio_file_path:
            raise ValueError(f"Session {session_id} has no audio file")

        # Update status
        session.processing_status = "processing"
        await db.commit()

        try:
            # Upload audio to Gemini
            audio_uri = await self.gemini.upload_file(session.audio_file_path)

            # Determine mime type from file extension
            ext = session.audio_file_path.lower().split(".")[-1]
            mime_types = {
                "mp3": "audio/mp3",
                "wav": "audio/wav",
                "m4a": "audio/mp4",
                "aac": "audio/aac",
                "ogg": "audio/ogg",
                "flac": "audio/flac",
            }
            mime_type = mime_types.get(ext, "audio/mp3")

            # Extract reasoning from audio
            response = await self.gemini.generate_with_audio(
                audio_uri=audio_uri,
                mime_type=mime_type,
                prompt=AUDIO_EXTRACTION_PROMPT,
                response_schema=EXTRACTION_SCHEMA,
                thinking_level="high",
            )

            extraction = SessionExtraction(**json.loads(response))

            # Save extracted data to session
            session.summary = extraction.summary
            session.open_questions = extraction.open_questions
            session.technologies_mentioned = extraction.technologies_mentioned
            session.processing_status = "completed"

            # Create Decision records for each extracted decision
            for extracted in extraction.decisions:
                # Generate embedding for searchability
                embedding_text = f"{extracted.decision} {extracted.reasoning}"
                embedding = await self.embeddings.generate_embedding(embedding_text)

                decision = Decision(
                    title=extracted.decision[:500],
                    decision_text=extracted.decision,
                    reasoning=extracted.reasoning,
                    alternatives_considered=extracted.alternatives_considered,
                    confidence=extracted.confidence,
                    domain=extracted.domain,
                    tags=extracted.tags,
                    status=DecisionStatus.ACTIVE,
                    source_type="audio",
                    source_timestamp_start=extracted.timestamp_start,
                    source_timestamp_end=extracted.timestamp_end,
                    visibility=VisibilityLevel.PRIVATE,
                    embedding=embedding,
                    owner_id=user_id,
                    session_id=session_id,
                )
                db.add(decision)

            await db.commit()
            logger.info(
                "Session processed",
                session_id=session_id,
                decisions_extracted=len(extraction.decisions),
            )

            return extraction

        except Exception as e:
            session.processing_status = "failed"
            session.extraction_metadata = {"error": str(e)}
            await db.commit()
            logger.error("Session processing failed", session_id=session_id, error=str(e))
            raise

    async def process_audio_direct(
        self,
        db: AsyncSession,
        audio_data: bytes,
        mime_type: str,
        user_id: int,
        title: str,
        git_context: dict | None = None,
    ) -> tuple[CodingSession, SessionExtraction]:
        """Process audio bytes directly without pre-existing session."""
        # Save audio file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext = mime_type.split("/")[-1]
        filename = f"session_{timestamp}.{ext}"
        file_path = await self.storage.save_file(audio_data, filename, user_id)

        # Create session record
        session = CodingSession(
            title=title,
            audio_file_path=file_path,
            owner_id=user_id,
            processing_status="pending",
            git_branch=git_context.get("branch") if git_context else None,
            git_commit_start=git_context.get("commit_start") if git_context else None,
            git_commit_end=git_context.get("commit_end") if git_context else None,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)

        # Process the session
        extraction = await self.process_session(db, session.id, user_id)

        return session, extraction


# Singleton
_audio_processor: AudioProcessor | None = None


def get_audio_processor() -> AudioProcessor:
    """Get audio processor singleton."""
    global _audio_processor
    if _audio_processor is None:
        _audio_processor = AudioProcessor()
    return _audio_processor
