"""Team collaboration endpoints."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.deps import CurrentUser, DbSession
from src.models import Team, TeamMembership, TeamRole, User
from src.services.team_knowledge_graph import get_team_knowledge_graph

router = APIRouter()


class TeamCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None


class TeamResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    member_count: int

    model_config = {"from_attributes": True}


class TeamMemberResponse(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: TeamRole
    bot_enabled: bool


class TeamQueryRequest(BaseModel):
    question: str


class TeamQueryResponse(BaseModel):
    synthesis: str
    sources: list[dict]
    contributors: list[str]
    latency_ms: int


class ConflictResponse(BaseModel):
    conflicts: list[dict]
    summary: str
    decisions_analyzed: int


class AlignmentRequest(BaseModel):
    topic: str
    user_ids: list[int]


# Team CRUD


@router.post("/", response_model=TeamResponse)
async def create_team(
    current_user: CurrentUser,
    db: DbSession,
    team_data: TeamCreate,
) -> dict:
    """Create a new team."""
    # Check slug uniqueness
    existing = await db.execute(select(Team).where(Team.slug == team_data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Team slug already exists")

    team = Team(
        name=team_data.name,
        slug=team_data.slug,
        description=team_data.description,
    )
    db.add(team)
    await db.flush()

    # Add creator as owner
    membership = TeamMembership(
        user_id=current_user.id,
        team_id=team.id,
        role=TeamRole.OWNER,
    )
    db.add(membership)
    await db.commit()
    await db.refresh(team)

    return {
        "id": team.id,
        "name": team.name,
        "slug": team.slug,
        "description": team.description,
        "member_count": 1,
    }


@router.get("/", response_model=list[TeamResponse])
async def list_my_teams(
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """List teams the current user belongs to."""
    result = await db.execute(
        select(Team)
        .join(TeamMembership)
        .options(selectinload(Team.memberships))
        .where(TeamMembership.user_id == current_user.id)
    )
    teams = result.scalars().all()

    return [
        {
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "description": t.description,
            "member_count": len(t.memberships),
        }
        for t in teams
    ]


@router.get("/{team_id}/members", response_model=list[TeamMemberResponse])
async def list_team_members(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """List all members of a team."""
    # Verify user is member of team
    membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    result = await db.execute(
        select(TeamMembership)
        .options(selectinload(TeamMembership.user))
        .where(TeamMembership.team_id == team_id)
    )
    memberships = result.scalars().all()

    return [
        {
            "user_id": m.user.id,
            "full_name": m.user.full_name,
            "email": m.user.email,
            "role": m.role,
            "bot_enabled": m.user.bot_enabled,
        }
        for m in memberships
    ]


@router.post("/{team_id}/members")
async def add_team_member(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
    user_id: int = Query(...),
    role: TeamRole = Query(TeamRole.MEMBER),
) -> dict:
    """Add a member to a team (requires admin/owner)."""
    # Verify requester is admin/owner
    requester_membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    requester = requester_membership.scalar_one_or_none()

    if not requester or requester.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Not authorized to add members")

    # Check user exists
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check not already member
    existing = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already a member")

    membership = TeamMembership(
        user_id=user_id,
        team_id=team_id,
        role=role,
    )
    db.add(membership)
    await db.commit()

    return {"message": "Member added"}


# Team Knowledge Graph Queries


@router.post("/{team_id}/query", response_model=TeamQueryResponse)
async def query_team(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
    query: TeamQueryRequest,
) -> dict:
    """Query across all team members' cognitive states."""
    # Verify user is member of team
    membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    graph = get_team_knowledge_graph()
    result = await graph.cross_team_query(
        db=db,
        question=query.question,
        team_id=team_id,
        requester_id=current_user.id,
    )

    return result.to_dict()


@router.get("/{team_id}/conflicts", response_model=ConflictResponse)
async def detect_conflicts(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
    days: int = 7,
) -> dict:
    """Detect reasoning conflicts across team members."""
    # Verify user is member of team
    membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    graph = get_team_knowledge_graph()
    result = await graph.detect_conflicts(db=db, team_id=team_id, days=days)

    return result.to_dict()


@router.post("/{team_id}/alignment", response_model=TeamQueryResponse)
async def check_alignment(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
    request: AlignmentRequest,
) -> dict:
    """Compare reasoning across specific team members on a topic."""
    # Verify user is member of team
    membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    # Verify all requested users are team members
    for user_id in request.user_ids:
        user_membership = await db.execute(
            select(TeamMembership)
            .where(TeamMembership.team_id == team_id)
            .where(TeamMembership.user_id == user_id)
        )
        if not user_membership.scalar_one_or_none():
            raise HTTPException(
                status_code=400, detail=f"User {user_id} is not a team member"
            )

    graph = get_team_knowledge_graph()
    result = await graph.multi_person_alignment(
        db=db,
        topic=request.topic,
        user_ids=request.user_ids,
        requester_id=current_user.id,
    )

    return result.to_dict()


@router.get("/{team_id}/activity")
async def get_team_activity(
    team_id: int,
    current_user: CurrentUser,
    db: DbSession,
    days: int = 7,
) -> dict:
    """Get recent team activity summary."""
    from datetime import datetime, timedelta
    from sqlalchemy import func
    from src.models import Decision, VisibilityLevel

    # Verify user is member of team
    membership = await db.execute(
        select(TeamMembership)
        .where(TeamMembership.team_id == team_id)
        .where(TeamMembership.user_id == current_user.id)
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")

    # Get team member IDs
    members_result = await db.execute(
        select(TeamMembership.user_id).where(TeamMembership.team_id == team_id)
    )
    member_ids = [r[0] for r in members_result.all()]

    cutoff = datetime.now() - timedelta(days=days)

    # Get recent team-visible decisions
    result = await db.execute(
        select(Decision)
        .options(selectinload(Decision.owner))
        .where(Decision.owner_id.in_(member_ids))
        .where(Decision.created_at >= cutoff)
        .where(
            Decision.visibility.in_([VisibilityLevel.TEAM, VisibilityLevel.PUBLIC])
        )
        .order_by(Decision.created_at.desc())
        .limit(50)
    )
    decisions = result.scalars().all()

    # Group by user
    by_user: dict[str, list] = {}
    for d in decisions:
        name = d.owner.full_name
        if name not in by_user:
            by_user[name] = []
        by_user[name].append({
            "id": d.id,
            "title": d.title,
            "domain": d.domain,
            "confidence": d.confidence,
            "date": d.created_at.isoformat(),
        })

    # Domain breakdown
    domains: dict[str, int] = {}
    for d in decisions:
        domains[d.domain] = domains.get(d.domain, 0) + 1

    return {
        "total_decisions": len(decisions),
        "by_user": by_user,
        "by_domain": domains,
        "period_days": days,
    }
