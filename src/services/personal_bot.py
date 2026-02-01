"""Personal cognitive bot for individual users."""
import json
import time
import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, text
from sqlalchemy.orm import selectinload

from src.models import Decision, User, CodingSession, VisibilityLevel, QueryLog
from src.services.gemini_client import get_gemini_client
from src.services.embedding_service import get_embedding_service

logger = structlog.get_logger()


QUERY_SYSTEM_PROMPT = """You are a personal cognitive assistant that helps retrieve and explain past decisions and reasoning.

Your role:
1. Answer questions based on the user's captured decisions and reasoning
2. Provide source attribution (timestamps, dates, sessions)
3. Highlight confidence levels
4. Connect related decisions when relevant
5. Be honest when information is incomplete or uncertain

When answering:
- Quote relevant reasoning directly when helpful
- Mention timestamps so the user can find the original audio
- Note if confidence was low on certain decisions
- Suggest related decisions they might want to review

Keep responses concise but complete."""


class QueryResult:
    """Result from a personal bot query."""

    def __init__(
        self,
        answer: str,
        sources: list[dict],
        confidence: float,
        related_decisions: list[dict],
        latency_ms: int,
    ):
        self.answer = answer
        self.sources = sources
        self.confidence = confidence
        self.related_decisions = related_decisions
        self.latency_ms = latency_ms

    def to_dict(self) -> dict:
        return {
            "answer": self.answer,
            "sources": self.sources,
            "confidence": self.confidence,
            "related_decisions": self.related_decisions,
            "latency_ms": self.latency_ms,
        }


class PersonalBot:
    """A personal cognitive bot for one user."""

    def __init__(self, user_id: int, user_name: str):
        self.user_id = user_id
        self.user_name = user_name
        self.gemini = get_gemini_client()
        self.embeddings = get_embedding_service()

    async def query(
        self,
        db: AsyncSession,
        question: str,
        querier_id: int | None = None,
        include_private: bool = False,
    ) -> QueryResult:
        """Query this user's cognitive state."""
        start_time = time.time()

        # Determine what decisions the querier can see
        can_see_private = include_private or querier_id == self.user_id

        # Get relevant decisions via semantic search
        decisions = await self._semantic_search(db, question, can_see_private, limit=10)

        if not decisions:
            return QueryResult(
                answer=f"I don't have any recorded decisions or reasoning from {self.user_name} that match your question.",
                sources=[],
                confidence=0.0,
                related_decisions=[],
                latency_ms=int((time.time() - start_time) * 1000),
            )

        # Format decisions as context
        context = self._format_decisions_context(decisions)

        # Generate response
        prompt = f"""Based on {self.user_name}'s captured reasoning and decisions:

{context}

Question: {question}

Provide a clear answer based on the captured decisions above. Include:
1. Direct answer to the question
2. Relevant quotes from their reasoning
3. Source references (dates, timestamps)
4. Confidence assessment
5. Any related decisions they should know about"""

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.flash_model,
            thinking_level="medium",
        )

        # Calculate average confidence from source decisions
        avg_confidence = sum(d.confidence for d in decisions) / len(decisions) if decisions else 0

        # Find related decisions (different from the ones directly answering the question)
        related = await self._find_related_decisions(db, decisions, can_see_private)

        latency_ms = int((time.time() - start_time) * 1000)

        # Log the query
        if querier_id:
            query_log = QueryLog(
                querier_id=querier_id,
                target_user_id=self.user_id,
                query_text=question,
                response_text=response,
                decisions_returned=len(decisions),
                sources_cited=[{"id": d.id, "title": d.title} for d in decisions],
                latency_ms=latency_ms,
                model_used=self.gemini.flash_model,
            )
            db.add(query_log)
            await db.commit()

        return QueryResult(
            answer=response,
            sources=[self._decision_to_source(d) for d in decisions],
            confidence=avg_confidence,
            related_decisions=[self._decision_to_source(d) for d in related],
            latency_ms=latency_ms,
        )

    async def _semantic_search(
        self,
        db: AsyncSession,
        query: str,
        include_private: bool,
        limit: int = 10,
    ) -> list[Decision]:
        """Search decisions by text matching (fallback when pgvector unavailable)."""
        # Build visibility filter
        if include_private:
            visibility_filter = Decision.owner_id == self.user_id
        else:
            visibility_filter = and_(
                Decision.owner_id == self.user_id,
                or_(
                    Decision.visibility == VisibilityLevel.PUBLIC,
                    Decision.visibility == VisibilityLevel.TEAM,
                ),
            )

        # Use text-based search as fallback (pgvector not available)
        # Search in title, decision_text, and reasoning fields
        query_lower = query.lower()
        search_terms = query_lower.split()

        # Build text search conditions
        text_conditions = []
        for term in search_terms[:5]:  # Limit to first 5 terms
            term_pattern = f"%{term}%"
            text_conditions.append(
                or_(
                    Decision.title.ilike(term_pattern),
                    Decision.decision_text.ilike(term_pattern),
                    Decision.reasoning.ilike(term_pattern),
                    Decision.domain.ilike(term_pattern),
                )
            )

        # Combine conditions - match any term
        if text_conditions:
            search_filter = or_(*text_conditions)
            result = await db.execute(
                select(Decision)
                .where(visibility_filter)
                .where(search_filter)
                .order_by(Decision.created_at.desc())
                .limit(limit)
            )
        else:
            # If no search terms, return most recent
            result = await db.execute(
                select(Decision)
                .where(visibility_filter)
                .order_by(Decision.created_at.desc())
                .limit(limit)
            )

        return list(result.scalars().all())

    async def _find_related_decisions(
        self,
        db: AsyncSession,
        source_decisions: list[Decision],
        include_private: bool,
    ) -> list[Decision]:
        """Find decisions related to the source decisions by domain/tags."""
        if not source_decisions:
            return []

        source_ids = {d.id for d in source_decisions}
        domains = {d.domain for d in source_decisions}
        tags = set()
        for d in source_decisions:
            tags.update(d.tags or [])

        if include_private:
            visibility_filter = Decision.owner_id == self.user_id
        else:
            visibility_filter = and_(
                Decision.owner_id == self.user_id,
                or_(
                    Decision.visibility == VisibilityLevel.PUBLIC,
                    Decision.visibility == VisibilityLevel.TEAM,
                ),
            )

        # Find decisions in same domains or with overlapping tags
        result = await db.execute(
            select(Decision)
            .where(visibility_filter)
            .where(Decision.id.notin_(source_ids))
            .where(
                or_(
                    Decision.domain.in_(domains),
                    Decision.tags.overlap(list(tags)) if tags else False,
                )
            )
            .order_by(Decision.created_at.desc())
            .limit(5)
        )

        return list(result.scalars().all())

    def _format_decisions_context(self, decisions: list[Decision]) -> str:
        """Format decisions as context for the LLM."""
        parts = []
        for i, d in enumerate(decisions, 1):
            timestamp_info = ""
            if d.source_timestamp_start is not None:
                mins = int(d.source_timestamp_start // 60)
                secs = int(d.source_timestamp_start % 60)
                timestamp_info = f" [Audio: {mins}:{secs:02d}]"

            parts.append(f"""
Decision {i}: {d.title}
Date: {d.created_at.strftime('%Y-%m-%d')}{timestamp_info}
Domain: {d.domain}
Confidence: {d.confidence:.0%}

Reasoning: {d.reasoning}

Alternatives considered: {', '.join(d.alternatives_considered) if d.alternatives_considered else 'None recorded'}
""")
        return "\n---\n".join(parts)

    def _decision_to_source(self, d: Decision) -> dict:
        """Convert decision to source reference dict."""
        return {
            "id": d.id,
            "title": d.title,
            "decision": d.decision_text,
            "reasoning": d.reasoning,
            "domain": d.domain,
            "confidence": d.confidence,
            "date": d.created_at.isoformat(),
            "timestamp_start": d.source_timestamp_start,
            "timestamp_end": d.source_timestamp_end,
            "session_id": d.session_id,
        }

    async def get_recent_decisions(
        self,
        db: AsyncSession,
        days: int = 7,
        include_private: bool = False,
    ) -> list[Decision]:
        """Get recent decisions for this user."""
        from datetime import datetime, timedelta

        cutoff = datetime.now() - timedelta(days=days)

        if include_private:
            visibility_filter = Decision.owner_id == self.user_id
        else:
            visibility_filter = and_(
                Decision.owner_id == self.user_id,
                or_(
                    Decision.visibility == VisibilityLevel.PUBLIC,
                    Decision.visibility == VisibilityLevel.TEAM,
                ),
            )

        result = await db.execute(
            select(Decision)
            .where(visibility_filter)
            .where(Decision.created_at >= cutoff)
            .order_by(Decision.created_at.desc())
        )

        return list(result.scalars().all())

    async def get_decisions_by_domain(
        self,
        db: AsyncSession,
        domain: str,
        include_private: bool = False,
    ) -> list[Decision]:
        """Get all decisions in a specific domain."""
        if include_private:
            visibility_filter = Decision.owner_id == self.user_id
        else:
            visibility_filter = and_(
                Decision.owner_id == self.user_id,
                or_(
                    Decision.visibility == VisibilityLevel.PUBLIC,
                    Decision.visibility == VisibilityLevel.TEAM,
                ),
            )

        result = await db.execute(
            select(Decision)
            .where(visibility_filter)
            .where(Decision.domain == domain)
            .order_by(Decision.created_at.desc())
        )

        return list(result.scalars().all())
