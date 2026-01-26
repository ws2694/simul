"""Decision model - core entity for captured reasoning."""
import enum
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Text, Float, Integer, ForeignKey, Enum, Index
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
# pgvector disabled for now - semantic search requires PostgreSQL pgvector extension
PGVECTOR_AVAILABLE = False

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.session import CodingSession


class DecisionStatus(str, enum.Enum):
    """Status of a decision."""

    DRAFT = "draft"
    ACTIVE = "active"
    IMPLEMENTED = "implemented"
    SUPERSEDED = "superseded"
    ABANDONED = "abandoned"


class VisibilityLevel(str, enum.Enum):
    """Visibility level for a decision."""

    PRIVATE = "private"
    TEAM = "team"
    PUBLIC = "public"
    SPECIFIC = "specific"  # Shared with specific users


class Decision(Base):
    """A captured decision with reasoning."""

    __tablename__ = "decisions"
    __table_args__ = (
        Index("ix_decisions_owner_domain", "owner_id", "domain"),
        Index("ix_decisions_visibility", "visibility"),
        Index("ix_decisions_status", "status"),
    )

    # Core fields
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    decision_text: Mapped[str] = mapped_column(Text, nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    alternatives_considered: Mapped[list[str]] = mapped_column(ARRAY(String), default=[])
    confidence: Mapped[float] = mapped_column(Float, nullable=False, default=0.5)

    # Classification
    domain: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=[])
    status: Mapped[DecisionStatus] = mapped_column(
        Enum(DecisionStatus), default=DecisionStatus.ACTIVE, nullable=False
    )

    # Source tracking
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # audio, meeting, manual
    source_timestamp_start: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    source_timestamp_end: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Code linking
    git_commits: Mapped[list[str]] = mapped_column(ARRAY(String), default=[])
    pr_numbers: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=[])
    file_paths: Mapped[list[str]] = mapped_column(ARRAY(String), default=[])

    # Visibility & permissions
    visibility: Mapped[VisibilityLevel] = mapped_column(
        Enum(VisibilityLevel), default=VisibilityLevel.PRIVATE, nullable=False
    )
    shared_with_user_ids: Mapped[list[int]] = mapped_column(ARRAY(Integer), default=[])

    # Vector embedding for semantic search
    # Using JSONB since pgvector extension is not available
    embedding: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Extra metadata
    extra_data: Mapped[dict] = mapped_column(JSONB, default={})

    # Foreign keys
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    session_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("coding_sessions.id"), nullable=True
    )

    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="decisions")
    session: Mapped[Optional["CodingSession"]] = relationship(
        "CodingSession", back_populates="decisions"
    )
