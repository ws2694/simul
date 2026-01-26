"""Decision management endpoints."""
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload

from src.api.deps import CurrentUser, DbSession
from src.models import Decision, DecisionStatus, VisibilityLevel
from src.services.embedding_service import get_embedding_service

router = APIRouter()


class DecisionCreate(BaseModel):
    title: str
    decision_text: str
    reasoning: str
    alternatives_considered: list[str] = []
    confidence: float = 0.5
    domain: str
    tags: list[str] = []
    visibility: VisibilityLevel = VisibilityLevel.PRIVATE
    git_commits: list[str] = []
    pr_numbers: list[int] = []
    file_paths: list[str] = []


class DecisionUpdate(BaseModel):
    title: str | None = None
    decision_text: str | None = None
    reasoning: str | None = None
    confidence: float | None = None
    status: DecisionStatus | None = None
    visibility: VisibilityLevel | None = None
    tags: list[str] | None = None
    git_commits: list[str] | None = None
    pr_numbers: list[int] | None = None


class DecisionResponse(BaseModel):
    id: int
    title: str
    decision_text: str
    reasoning: str
    alternatives_considered: list[str]
    confidence: float
    domain: str
    tags: list[str]
    status: DecisionStatus
    visibility: VisibilityLevel
    source_type: str
    source_timestamp_start: float | None
    source_timestamp_end: float | None
    git_commits: list[str]
    pr_numbers: list[int]
    file_paths: list[str]
    owner_id: int
    session_id: int | None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_dates(cls, obj: Decision) -> "DecisionResponse":
        return cls(
            id=obj.id,
            title=obj.title,
            decision_text=obj.decision_text,
            reasoning=obj.reasoning,
            alternatives_considered=obj.alternatives_considered or [],
            confidence=obj.confidence,
            domain=obj.domain,
            tags=obj.tags or [],
            status=obj.status,
            visibility=obj.visibility,
            source_type=obj.source_type,
            source_timestamp_start=obj.source_timestamp_start,
            source_timestamp_end=obj.source_timestamp_end,
            git_commits=obj.git_commits or [],
            pr_numbers=obj.pr_numbers or [],
            file_paths=obj.file_paths or [],
            owner_id=obj.owner_id,
            session_id=obj.session_id,
            created_at=obj.created_at.isoformat(),
            updated_at=obj.updated_at.isoformat(),
        )


class DecisionListResponse(BaseModel):
    decisions: list[DecisionResponse]
    total: int


@router.post("/", response_model=DecisionResponse)
async def create_decision(
    current_user: CurrentUser,
    db: DbSession,
    decision_data: DecisionCreate,
) -> DecisionResponse:
    """Manually create a decision."""
    # Generate embedding
    embeddings = get_embedding_service()
    embedding_text = f"{decision_data.title} {decision_data.decision_text} {decision_data.reasoning}"
    embedding = await embeddings.generate_embedding(embedding_text)

    decision = Decision(
        title=decision_data.title,
        decision_text=decision_data.decision_text,
        reasoning=decision_data.reasoning,
        alternatives_considered=decision_data.alternatives_considered,
        confidence=decision_data.confidence,
        domain=decision_data.domain,
        tags=decision_data.tags,
        status=DecisionStatus.ACTIVE,
        source_type="manual",
        visibility=decision_data.visibility,
        git_commits=decision_data.git_commits,
        pr_numbers=decision_data.pr_numbers,
        file_paths=decision_data.file_paths,
        embedding=embedding,
        owner_id=current_user.id,
    )
    db.add(decision)
    await db.commit()
    await db.refresh(decision)

    return DecisionResponse.from_orm_with_dates(decision)


@router.get("/", response_model=DecisionListResponse)
async def list_decisions(
    current_user: CurrentUser,
    db: DbSession,
    skip: int = 0,
    limit: int = 50,
    domain: str | None = None,
    status: DecisionStatus | None = None,
    tag: str | None = None,
) -> dict:
    """List decisions for the current user."""
    query = select(Decision).where(Decision.owner_id == current_user.id)

    if domain:
        query = query.where(Decision.domain == domain)
    if status:
        query = query.where(Decision.status == status)
    if tag:
        query = query.where(Decision.tags.contains([tag]))

    query = query.order_by(Decision.created_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    decisions = result.scalars().all()

    # Get total count
    count_query = select(Decision).where(Decision.owner_id == current_user.id)
    if domain:
        count_query = count_query.where(Decision.domain == domain)
    if status:
        count_query = count_query.where(Decision.status == status)
    if tag:
        count_query = count_query.where(Decision.tags.contains([tag]))

    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return {
        "decisions": [DecisionResponse.from_orm_with_dates(d) for d in decisions],
        "total": total,
    }


@router.get("/domains")
async def list_domains(
    current_user: CurrentUser,
    db: DbSession,
) -> list[str]:
    """Get all unique domains for the user's decisions."""
    result = await db.execute(
        select(Decision.domain)
        .where(Decision.owner_id == current_user.id)
        .distinct()
    )
    domains = [r[0] for r in result.all()]
    return sorted(domains)


@router.get("/{decision_id}", response_model=DecisionResponse)
async def get_decision(
    decision_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> DecisionResponse:
    """Get a specific decision."""
    decision = await db.get(Decision, decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    # Check access
    if decision.owner_id != current_user.id:
        if decision.visibility == VisibilityLevel.PRIVATE:
            raise HTTPException(status_code=403, detail="Access denied")
        if (
            decision.visibility == VisibilityLevel.SPECIFIC
            and current_user.id not in decision.shared_with_user_ids
        ):
            raise HTTPException(status_code=403, detail="Access denied")

    return DecisionResponse.from_orm_with_dates(decision)


@router.patch("/{decision_id}", response_model=DecisionResponse)
async def update_decision(
    decision_id: int,
    current_user: CurrentUser,
    db: DbSession,
    decision_update: DecisionUpdate,
) -> DecisionResponse:
    """Update a decision."""
    decision = await db.get(Decision, decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if decision.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this decision")

    # Update fields
    update_data = decision_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(decision, field, value)

    # Regenerate embedding if content changed
    if any(f in update_data for f in ["title", "decision_text", "reasoning"]):
        embeddings = get_embedding_service()
        embedding_text = f"{decision.title} {decision.decision_text} {decision.reasoning}"
        decision.embedding = await embeddings.generate_embedding(embedding_text)

    await db.commit()
    await db.refresh(decision)

    return DecisionResponse.from_orm_with_dates(decision)


@router.delete("/{decision_id}")
async def delete_decision(
    decision_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Delete a decision."""
    decision = await db.get(Decision, decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if decision.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this decision")

    await db.delete(decision)
    await db.commit()

    return {"message": "Decision deleted"}


@router.post("/{decision_id}/share")
async def share_decision(
    decision_id: int,
    current_user: CurrentUser,
    db: DbSession,
    user_ids: list[int] = Query(...),
) -> DecisionResponse:
    """Share a decision with specific users."""
    decision = await db.get(Decision, decision_id)

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found")

    if decision.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to share this decision")

    decision.visibility = VisibilityLevel.SPECIFIC
    decision.shared_with_user_ids = list(set(decision.shared_with_user_ids or []) | set(user_ids))

    await db.commit()
    await db.refresh(decision)

    return DecisionResponse.from_orm_with_dates(decision)
