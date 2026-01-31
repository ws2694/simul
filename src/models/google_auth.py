"""Google OAuth token model."""
from datetime import datetime
from typing import TYPE_CHECKING, Optional
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models.base import Base

if TYPE_CHECKING:
    from src.models.user import User


class GoogleOAuthToken(Base):
    """Stored Google OAuth2 tokens for a user."""

    __tablename__ = "google_oauth_tokens"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), unique=True, nullable=False, index=True
    )
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    token_type: Mapped[str] = mapped_column(String(50), default="Bearer", nullable=False)
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scopes: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    user: Mapped["User"] = relationship("User")
