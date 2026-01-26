"""User model."""
from typing import TYPE_CHECKING
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.decision import Decision
    from src.models.session import CodingSession
    from src.models.team import TeamMembership


class User(Base):
    """User account model."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Bot settings
    bot_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    default_visibility: Mapped[str] = mapped_column(
        String(20), default="private", nullable=False
    )  # private, team, public

    # Relationships
    decisions: Mapped[list["Decision"]] = relationship(
        "Decision", back_populates="owner", cascade="all, delete-orphan"
    )
    coding_sessions: Mapped[list["CodingSession"]] = relationship(
        "CodingSession", back_populates="owner", cascade="all, delete-orphan"
    )
    team_memberships: Mapped[list["TeamMembership"]] = relationship(
        "TeamMembership", back_populates="user", cascade="all, delete-orphan"
    )
