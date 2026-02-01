"""Team knowledge graph for cross-person queries and conflict detection."""
import json
import time
import structlog
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from src.models import Decision, User, Team, TeamMembership, VisibilityLevel, QueryLog
from src.services.gemini_client import get_gemini_client
from src.services.embedding_service import get_embedding_service
from src.services.personal_bot import PersonalBot

logger = structlog.get_logger()


CONFLICT_DETECTION_PROMPT = """Analyze these recent team decisions for potential conflicts or misalignments.

Decisions from team members:
{decisions_json}

Identify any decisions that:
1. Directly contradict each other
2. Have incompatible assumptions
3. Would cause integration issues if both implemented
4. Represent different approaches to the same problem without coordination

For each conflict found, provide:
- Who is involved (user IDs)
- Which decisions conflict (decision IDs)
- Clear description of the conflict
- Severity (low/medium/high)
- Suggested resolution approach

If no conflicts are found, return an empty conflicts array."""


CONFLICT_SCHEMA = {
    "type": "object",
    "properties": {
        "conflicts": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "participants": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "User names involved in the conflict",
                    },
                    "decision_ids": {
                        "type": "array",
                        "items": {"type": "integer"},
                        "description": "IDs of conflicting decisions",
                    },
                    "conflict_description": {
                        "type": "string",
                        "description": "Clear description of what conflicts",
                    },
                    "severity": {
                        "type": "string",
                        "enum": ["low", "medium", "high"],
                        "description": "How severe is this conflict",
                    },
                    "suggested_resolution": {
                        "type": "string",
                        "description": "How to resolve this conflict",
                    },
                },
                "required": [
                    "participants",
                    "decision_ids",
                    "conflict_description",
                    "severity",
                    "suggested_resolution",
                ],
            },
        },
        "summary": {
            "type": "string",
            "description": "Overall summary of team alignment",
        },
    },
    "required": ["conflicts", "summary"],
}


SYNTHESIS_PROMPT = """Synthesize perspectives from multiple team members on the following topic.

Topic: {topic}

Individual perspectives:
{perspectives_json}

Provide:
1. Summary of each person's position
2. Areas of alignment across the team
3. Areas of disagreement or different approaches
4. Recommended next steps (who should talk, what needs deciding)
5. Key questions that need resolution

Be specific about who said what and cite the reasoning."""


class TeamQueryResult:
    """Result from a team-wide query."""

    def __init__(
        self,
        synthesis: str,
        sources: list[dict],
        contributors: list[str],
        latency_ms: int,
    ):
        self.synthesis = synthesis
        self.sources = sources
        self.contributors = contributors
        self.latency_ms = latency_ms

    def to_dict(self) -> dict:
        return {
            "synthesis": self.synthesis,
            "sources": self.sources,
            "contributors": self.contributors,
            "latency_ms": self.latency_ms,
        }


class ConflictResult:
    """Result from conflict detection."""

    def __init__(
        self,
        conflicts: list[dict],
        summary: str,
        decisions_analyzed: int,
    ):
        self.conflicts = conflicts
        self.summary = summary
        self.decisions_analyzed = decisions_analyzed

    def to_dict(self) -> dict:
        return {
            "conflicts": self.conflicts,
            "summary": self.summary,
            "decisions_analyzed": self.decisions_analyzed,
        }


class TeamKnowledgeGraph:
    """Query across all team members' cognitive states."""

    def __init__(self):
        self.gemini = get_gemini_client()
        self.embeddings = get_embedding_service()

    async def cross_team_query(
        self,
        db: AsyncSession,
        question: str,
        team_id: int,
        requester_id: int,
    ) -> TeamQueryResult:
        """Search all team members' bots and synthesize answer."""
        start_time = time.time()

        # Get team members
        members = await self._get_team_members(db, team_id)

        if not members:
            return TeamQueryResult(
                synthesis="No team members found.",
                sources=[],
                contributors=[],
                latency_ms=int((time.time() - start_time) * 1000),
            )

        # Search each member's decisions
        all_results = []
        for member in members:
            decisions = await self._search_member_decisions(
                db, question, member.id, requester_id
            )
            for d in decisions:
                all_results.append(
                    {
                        "owner_id": member.id,
                        "owner_name": member.full_name,
                        "decision_id": d.id,
                        "title": d.title,
                        "decision": d.decision_text,
                        "reasoning": d.reasoning,
                        "domain": d.domain,
                        "confidence": d.confidence,
                        "date": d.created_at.isoformat(),
                    }
                )

        if not all_results:
            return TeamQueryResult(
                synthesis="No relevant decisions found from any team member.",
                sources=[],
                contributors=[],
                latency_ms=int((time.time() - start_time) * 1000),
            )

        # Synthesize across all results
        prompt = f"""Question: {question}

Relevant decisions from team members:
{json.dumps(all_results, indent=2)}

Synthesize an answer that:
1. Identifies who made relevant decisions
2. Shows the reasoning from each person
3. Highlights any conflicts or alignments
4. Provides source attribution (who said what, when)

Keep the response focused and actionable."""

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.pro_model,
            thinking_level="high",
        )

        contributors = list(set(r["owner_name"] for r in all_results))
        latency_ms = int((time.time() - start_time) * 1000)

        # Log the query
        query_log = QueryLog(
            querier_id=requester_id,
            target_user_id=None,
            is_team_query=True,
            query_text=question,
            response_text=response,
            decisions_returned=len(all_results),
            sources_cited=all_results,
            latency_ms=latency_ms,
            model_used=self.gemini.pro_model,
        )
        db.add(query_log)
        await db.commit()

        return TeamQueryResult(
            synthesis=response,
            sources=all_results,
            contributors=contributors,
            latency_ms=latency_ms,
        )

    async def detect_conflicts(
        self,
        db: AsyncSession,
        team_id: int,
        days: int = 7,
    ) -> ConflictResult:
        """Proactively detect reasoning conflicts across team."""
        # Get all team members
        members = await self._get_team_members(db, team_id)

        if not members:
            return ConflictResult(
                conflicts=[],
                summary="No team members found.",
                decisions_analyzed=0,
            )

        # Get recent decisions from all members (team-visible or public)
        cutoff = datetime.now() - timedelta(days=days)
        member_ids = [m.id for m in members]

        result = await db.execute(
            select(Decision)
            .options(selectinload(Decision.owner))
            .where(Decision.owner_id.in_(member_ids))
            .where(Decision.created_at >= cutoff)
            .where(
                or_(
                    Decision.visibility == VisibilityLevel.TEAM,
                    Decision.visibility == VisibilityLevel.PUBLIC,
                )
            )
            .order_by(Decision.created_at.desc())
        )
        decisions = list(result.scalars().all())

        if len(decisions) < 2:
            return ConflictResult(
                conflicts=[],
                summary="Not enough decisions to analyze for conflicts.",
                decisions_analyzed=len(decisions),
            )

        # Format decisions for analysis
        decisions_data = [
            {
                "id": d.id,
                "owner_id": d.owner_id,
                "owner_name": d.owner.full_name,
                "title": d.title,
                "decision": d.decision_text,
                "reasoning": d.reasoning,
                "domain": d.domain,
                "date": d.created_at.isoformat(),
            }
            for d in decisions
        ]

        # Analyze for conflicts
        prompt = CONFLICT_DETECTION_PROMPT.format(
            decisions_json=json.dumps(decisions_data, indent=2)
        )

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.pro_model,
            response_schema=CONFLICT_SCHEMA,
            thinking_level="high",
        )

        result_data = json.loads(response)

        return ConflictResult(
            conflicts=result_data.get("conflicts", []),
            summary=result_data.get("summary", ""),
            decisions_analyzed=len(decisions),
        )

    async def multi_person_alignment(
        self,
        db: AsyncSession,
        topic: str,
        user_ids: list[int],
        requester_id: int,
    ) -> TeamQueryResult:
        """Compare reasoning across specific team members without meetings."""
        start_time = time.time()

        # Get individual perspectives
        perspectives = {}
        all_sources = []

        for user_id in user_ids:
            # Get user info
            user = await db.get(User, user_id)
            if not user:
                continue

            # Create personal bot and query
            bot = PersonalBot(user_id, user.full_name)
            result = await bot.query(
                db=db,
                question=f"What is your approach/thinking on: {topic}",
                querier_id=requester_id,
                include_private=False,
            )

            perspectives[user.full_name] = {
                "answer": result.answer,
                "confidence": result.confidence,
                "sources": result.sources,
            }
            all_sources.extend(result.sources)

        if not perspectives:
            return TeamQueryResult(
                synthesis="No perspectives found from the specified users.",
                sources=[],
                contributors=[],
                latency_ms=int((time.time() - start_time) * 1000),
            )

        # Synthesize perspectives
        prompt = SYNTHESIS_PROMPT.format(
            topic=topic,
            perspectives_json=json.dumps(perspectives, indent=2),
        )

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.pro_model,
            thinking_level="high",
        )

        return TeamQueryResult(
            synthesis=response,
            sources=all_sources,
            contributors=list(perspectives.keys()),
            latency_ms=int((time.time() - start_time) * 1000),
        )

    async def _get_team_members(self, db: AsyncSession, team_id: int) -> list[User]:
        """Get all members of a team."""
        result = await db.execute(
            select(User)
            .join(TeamMembership)
            .where(TeamMembership.team_id == team_id)
            .where(User.bot_enabled == True)
        )
        return list(result.scalars().all())

    async def _search_member_decisions(
        self,
        db: AsyncSession,
        query: str,
        member_id: int,
        requester_id: int,
    ) -> list[Decision]:
        """Search a team member's decisions (respecting visibility)."""
        # Can see team-visible and public decisions
        visibility_filter = and_(
            Decision.owner_id == member_id,
            or_(
                Decision.visibility == VisibilityLevel.TEAM,
                Decision.visibility == VisibilityLevel.PUBLIC,
                # Also include if specifically shared with requester
                Decision.shared_with_user_ids.contains([requester_id]),
            ),
        )

        # Use text-based search (embeddings stored as JSONB, not pgvector)
        query_lower = query.lower()
        search_terms = query_lower.split()[:5]

        text_conditions = []
        for term in search_terms:
            term_pattern = f"%{term}%"
            text_conditions.append(
                or_(
                    Decision.title.ilike(term_pattern),
                    Decision.decision_text.ilike(term_pattern),
                    Decision.reasoning.ilike(term_pattern),
                    Decision.domain.ilike(term_pattern),
                )
            )

        if text_conditions:
            search_filter = or_(*text_conditions)
            result = await db.execute(
                select(Decision)
                .where(visibility_filter)
                .where(search_filter)
                .order_by(Decision.created_at.desc())
                .limit(5)
            )
        else:
            result = await db.execute(
                select(Decision)
                .where(visibility_filter)
                .order_by(Decision.created_at.desc())
                .limit(5)
            )

        return list(result.scalars().all())


# Singleton
_team_knowledge_graph: TeamKnowledgeGraph | None = None


def get_team_knowledge_graph() -> TeamKnowledgeGraph:
    """Get team knowledge graph singleton."""
    global _team_knowledge_graph
    if _team_knowledge_graph is None:
        _team_knowledge_graph = TeamKnowledgeGraph()
    return _team_knowledge_graph
