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
    alternatives_considered: list[str] = []
    confidence: float
    timestamp_start: float = 0
    timestamp_end: float = 0
    domain: str
    tags: list[str] = []


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
            # Read audio file as bytes
            with open(session.audio_file_path, "rb") as f:
                audio_data = f.read()

            # Determine mime type from file extension
            ext = session.audio_file_path.lower().split(".")[-1]
            mime_types = {
                "mp3": "audio/mp3",
                "wav": "audio/wav",
                "m4a": "audio/mp4",
                "aac": "audio/aac",
                "ogg": "audio/ogg",
                "flac": "audio/flac",
                "webm": "audio/webm",
            }
            mime_type = mime_types.get(ext, "audio/mp3")

            # Build prompt that asks for JSON output
            json_prompt = f"""{AUDIO_EXTRACTION_PROMPT}

Return your response as a valid JSON object with this exact structure:
{{
  "summary": "brief summary of the session",
  "decisions": [
    {{
      "decision": "the decision, thought, or insight",
      "reasoning": "why this was decided or the context behind it",
      "alternatives_considered": ["alternative 1", "alternative 2"],
      "confidence": 0.8,
      "timestamp_start": 0,
      "timestamp_end": 60,
      "domain": "strategy|product|engineering|design|marketing|operations|finance|hr|legal|research|planning|process|communication|other",
      "tags": ["tag1", "tag2"]
    }}
  ],
  "open_questions": ["question 1", "question 2"],
  "technologies_mentioned": ["concept1", "tool1", "term1"]
}}

Return ONLY the JSON object, no markdown formatting or explanation."""

            # Extract reasoning from audio using inline bytes
            response = await self.gemini.generate_with_audio_bytes(
                audio_data=audio_data,
                mime_type=mime_type,
                prompt=json_prompt,
            )

            # Clean up response if it has markdown formatting
            response_text = response.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            extraction = SessionExtraction(**json.loads(response_text))

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
