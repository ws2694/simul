"""Personal bot query endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from src.api.deps import CurrentUser, DbSession
from src.models import User, Decision
from src.services.personal_bot import PersonalBot

router = APIRouter()


class BotQuery(BaseModel):
    question: str


class BotQueryResponse(BaseModel):
    answer: str
    sources: list[dict]
    confidence: float
    related_decisions: list[dict]
    latency_ms: int


class DomainSummaryResponse(BaseModel):
    domain: str
    decision_count: int
    avg_confidence: float
    recent_decisions: list[dict]


@router.post("/query", response_model=BotQueryResponse)
async def query_my_bot(
    current_user: CurrentUser,
    db: DbSession,
    query: BotQuery,
) -> dict:
    """Query your own personal cognitive bot."""
    bot = PersonalBot(current_user.id, current_user.full_name)
    result = await bot.query(
        db=db,
        question=query.question,
        querier_id=current_user.id,
        include_private=True,  # Can see own private decisions
    )
    return result.to_dict()


@router.post("/users/{user_id}/query", response_model=BotQueryResponse)
async def query_user_bot(
    user_id: int,
    current_user: CurrentUser,
    db: DbSession,
    query: BotQuery,
) -> dict:
    """Query another user's cognitive bot (respects visibility settings)."""
    # Get target user
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if not target_user.bot_enabled:
        raise HTTPException(status_code=403, detail="User's bot is disabled")

    # Query their bot (only sees team/public decisions)
    bot = PersonalBot(user_id, target_user.full_name)
    result = await bot.query(
        db=db,
        question=query.question,
        querier_id=current_user.id,
        include_private=False,  # Cannot see their private decisions
    )
    return result.to_dict()


@router.get("/domains", response_model=list[DomainSummaryResponse])
async def get_my_domain_summaries(
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """Get summaries of decisions by domain."""
    # Get all decisions grouped by domain
    result = await db.execute(
        select(Decision)
        .where(Decision.owner_id == current_user.id)
        .order_by(Decision.domain, Decision.created_at.desc())
    )
    decisions = result.scalars().all()

    # Group by domain
    domains: dict[str, list[Decision]] = {}
    for d in decisions:
        if d.domain not in domains:
            domains[d.domain] = []
        domains[d.domain].append(d)

    # Build summaries
    summaries = []
    for domain, domain_decisions in domains.items():
        avg_confidence = sum(d.confidence for d in domain_decisions) / len(domain_decisions)
        recent = domain_decisions[:3]

        summaries.append({
            "domain": domain,
            "decision_count": len(domain_decisions),
            "avg_confidence": avg_confidence,
            "recent_decisions": [
                {
                    "id": d.id,
                    "title": d.title,
                    "confidence": d.confidence,
                    "date": d.created_at.isoformat(),
                }
                for d in recent
            ],
        })

    return sorted(summaries, key=lambda x: x["decision_count"], reverse=True)


@router.get("/recent")
async def get_recent_reasoning(
    current_user: CurrentUser,
    db: DbSession,
    days: int = 7,
    limit: int = 20,
) -> dict:
    """Get recent decisions and reasoning."""
    bot = PersonalBot(current_user.id, current_user.full_name)
    decisions = await bot.get_recent_decisions(db, days=days, include_private=True)

    return {
        "decisions": [
            {
                "id": d.id,
                "title": d.title,
                "decision": d.decision_text,
                "reasoning": d.reasoning[:200] + "..." if len(d.reasoning) > 200 else d.reasoning,
                "domain": d.domain,
                "confidence": d.confidence,
                "date": d.created_at.isoformat(),
            }
            for d in decisions[:limit]
        ],
        "total": len(decisions),
    }


@router.get("/stats")
async def get_bot_stats(
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Get statistics about your cognitive state."""
    from datetime import datetime, timedelta
    from sqlalchemy import func

    # Total decisions
    total_result = await db.execute(
        select(func.count(Decision.id)).where(Decision.owner_id == current_user.id)
    )
    total_decisions = total_result.scalar()

    # Decisions this week
    week_ago = datetime.now() - timedelta(days=7)
    week_result = await db.execute(
        select(func.count(Decision.id))
        .where(Decision.owner_id == current_user.id)
        .where(Decision.created_at >= week_ago)
    )
    decisions_this_week = week_result.scalar()

    # Average confidence
    conf_result = await db.execute(
        select(func.avg(Decision.confidence)).where(Decision.owner_id == current_user.id)
    )
    avg_confidence = conf_result.scalar() or 0

    # Most active domains
    domain_result = await db.execute(
        select(Decision.domain, func.count(Decision.id).label("count"))
        .where(Decision.owner_id == current_user.id)
        .group_by(Decision.domain)
        .order_by(func.count(Decision.id).desc())
        .limit(5)
    )
    top_domains = [{"domain": r[0], "count": r[1]} for r in domain_result.all()]

    # Low confidence decisions (might need revisiting)
    low_conf_result = await db.execute(
        select(Decision)
        .where(Decision.owner_id == current_user.id)
        .where(Decision.confidence < 0.5)
        .order_by(Decision.created_at.desc())
        .limit(5)
    )
    low_confidence = [
        {"id": d.id, "title": d.title, "confidence": d.confidence}
        for d in low_conf_result.scalars().all()
    ]

    return {
        "total_decisions": total_decisions,
        "decisions_this_week": decisions_this_week,
        "avg_confidence": round(avg_confidence, 2),
        "top_domains": top_domains,
        "low_confidence_decisions": low_confidence,
    }
