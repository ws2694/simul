"""Coding session model."""
import enum
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Text, Integer, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.decision import Decision


class SessionType(str, enum.Enum):
    """Type of captured session."""

    CODING = "coding"
    MEETING = "meeting"
    CODE_REVIEW = "code_review"
    DESIGN = "design"
    DEBUGGING = "debugging"


class CodingSession(Base):
    """A recorded coding/working session."""

    __tablename__ = "coding_sessions"

    # Core fields
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    session_type: Mapped[SessionType] = mapped_column(
        Enum(SessionType), default=SessionType.CODING, nullable=False
    )
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Media files
    audio_file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    video_file_path: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    transcript: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Duration in seconds
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Processing status
    processing_status: Mapped[str] = mapped_column(
        String(50), default="pending", nullable=False
    )  # pending, processing, completed, failed

    # Git context at time of recording
    git_branch: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    git_commit_start: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)
    git_commit_end: Mapped[Optional[str]] = mapped_column(String(40), nullable=True)

    # Extraction results
    open_questions: Mapped[list] = mapped_column(JSONB, default=[])
    technologies_mentioned: Mapped[list] = mapped_column(JSONB, default=[])
    extraction_metadata: Mapped[dict] = mapped_column(JSONB, default={})

    # Foreign keys
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="coding_sessions")
    decisions: Mapped[list["Decision"]] = relationship(
        "Decision", back_populates="session", cascade="all, delete-orphan"
    )
