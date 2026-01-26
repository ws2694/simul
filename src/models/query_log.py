"""Query logging for analytics."""
from typing import Optional
from sqlalchemy import String, Text, Integer, ForeignKey, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src.models.base import Base


class QueryLog(Base):
    """Log of queries made to bots."""

    __tablename__ = "query_logs"

    # Who queried whom
    querier_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    target_user_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True, index=True
    )
    is_team_query: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Query details
    query_text: Mapped[str] = mapped_column(Text, nullable=False)
    response_text: Mapped[str] = mapped_column(Text, nullable=False)

    # Results
    decisions_returned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sources_cited: Mapped[list] = mapped_column(JSONB, default=[])

    # Performance
    latency_ms: Mapped[int] = mapped_column(Integer, nullable=True)
    model_used: Mapped[str] = mapped_column(String(100), nullable=True)

    # Feedback
    user_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 1-5
    was_helpful: Mapped[Optional[bool]] = mapped_column(nullable=True)

    # Extra metadata
    extra_data: Mapped[dict] = mapped_column(JSONB, default={})
