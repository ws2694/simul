"""Bot meeting models for team bot-to-bot discussions."""
import enum
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import String, ForeignKey, Enum, UniqueConstraint, Integer, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.user import User
    from src.models.team import Team


class MeetingStatus(str, enum.Enum):
    """Status of a bot meeting."""

    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MessageRole(str, enum.Enum):
    """Role of a message sender in a bot meeting."""

    BOT = "bot"  # A user's bot speaking
    FACILITATOR = "facilitator"  # AI facilitator/moderator
    SYSTEM = "system"  # System messages


class BotMeeting(Base):
    """A bot-to-bot meeting where team members' bots discuss a topic."""

    __tablename__ = "bot_meetings"

    # Core fields
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    topic: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus), default=MeetingStatus.SCHEDULED, nullable=False
    )

    # Foreign keys
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id"), nullable=False, index=True
    )
    initiator_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    ended_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Results
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    consensus_reached: Mapped[Optional[bool]] = mapped_column(nullable=True)
    action_items: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)

    # Relationships
    team: Mapped["Team"] = relationship("Team")
    initiator: Mapped["User"] = relationship("User", foreign_keys=[initiator_id])
    participants: Mapped[list["BotMeetingParticipant"]] = relationship(
        "BotMeetingParticipant", back_populates="meeting", cascade="all, delete-orphan"
    )
    messages: Mapped[list["BotMeetingMessage"]] = relationship(
        "BotMeetingMessage",
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="BotMeetingMessage.sequence",
    )


class BotMeetingParticipant(Base):
    """A participant (user whose bot will speak) in a bot meeting."""

    __tablename__ = "bot_meeting_participants"
    __table_args__ = (
        UniqueConstraint("meeting_id", "user_id", name="uq_meeting_user"),
    )

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("bot_meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    joined_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, nullable=False
    )
    is_bot_active: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    meeting: Mapped["BotMeeting"] = relationship(
        "BotMeeting", back_populates="participants"
    )
    user: Mapped["User"] = relationship("User")


class BotMeetingMessage(Base):
    """A message in a bot meeting conversation."""

    __tablename__ = "bot_meeting_messages"

    meeting_id: Mapped[int] = mapped_column(
        ForeignKey("bot_meetings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role: Mapped[MessageRole] = mapped_column(
        Enum(MessageRole), nullable=False
    )
    speaker_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )
    speaker_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Source attribution
    cited_decisions: Mapped[Optional[list[int]]] = mapped_column(
        ARRAY(Integer), nullable=True
    )
    reasoning_basis: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Ordering
    sequence: Mapped[int] = mapped_column(nullable=False)

    # Relationships
    meeting: Mapped["BotMeeting"] = relationship(
        "BotMeeting", back_populates="messages"
    )
    speaker_user: Mapped[Optional["User"]] = relationship("User")
