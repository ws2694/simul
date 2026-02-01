"""Bot meeting API endpoints."""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from src.api.deps import CurrentUser, DbSession
from src.models import (
    BotMeeting,
    BotMeetingParticipant,
    BotMeetingMessage,
    MeetingStatus,
    MessageRole,
    TeamMembership,
)
from src.services.bot_meeting_service import get_meeting_service

router = APIRouter()


# Request/Response schemas


class MeetingCreate(BaseModel):
    """Request to create a new meeting."""

    title: str
    topic: str
    description: str | None = None
    team_id: int
    participant_ids: list[int]


class ParticipantResponse(BaseModel):
    """Response for a meeting participant."""

    user_id: int
    full_name: str
    joined_at: str
    is_bot_active: bool

    model_config = {"from_attributes": True}


class MessageResponse(BaseModel):
    """Response for a meeting message."""

    id: int
    role: str
    speaker_name: str
    speaker_user_id: int | None
    content: str
    cited_decisions: list[int] | None
    sequence: int
    created_at: str

    model_config = {"from_attributes": True}


class MeetingResponse(BaseModel):
    """Response for meeting list."""

    id: int
    title: str
    topic: str
    status: str
    initiator_name: str
    participant_count: int
    message_count: int
    created_at: str
    started_at: str | None
    ended_at: str | None

    model_config = {"from_attributes": True}


class MeetingDetailResponse(BaseModel):
    """Detailed meeting response."""

    id: int
    title: str
    topic: str
    description: str | None
    status: str
    team_id: int
    initiator_id: int
    initiator_name: str
    participant_count: int
    created_at: str
    started_at: str | None
    ended_at: str | None
    summary: str | None
    consensus_reached: bool | None
    action_items: list[dict] | None
    participants: list[ParticipantResponse]
    messages: list[MessageResponse]

    model_config = {"from_attributes": True}


# Helper functions


async def _verify_team_member(db: DbSession, team_id: int, user_id: int) -> None:
    """Verify user is a member of the team."""
    membership = await db.execute(
        select(TeamMembership).where(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == user_id,
        )
    )
    if not membership.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member of this team")


def _meeting_to_response(meeting: BotMeeting) -> dict:
    """Convert meeting to response dict."""
    return {
        "id": meeting.id,
        "title": meeting.title,
        "topic": meeting.topic,
        "status": meeting.status.value,
        "initiator_name": meeting.initiator.full_name if meeting.initiator else "Unknown",
        "participant_count": len(meeting.participants) if meeting.participants else 0,
        "message_count": len(meeting.messages) if meeting.messages else 0,
        "created_at": meeting.created_at.isoformat(),
        "started_at": meeting.started_at.isoformat() if meeting.started_at else None,
        "ended_at": meeting.ended_at.isoformat() if meeting.ended_at else None,
    }


def _meeting_to_detail_response(meeting: BotMeeting) -> dict:
    """Convert meeting to detailed response dict."""
    participants = []
    for p in meeting.participants:
        participants.append({
            "user_id": p.user_id,
            "full_name": p.user.full_name if p.user else "Unknown",
            "joined_at": p.joined_at.isoformat(),
            "is_bot_active": p.is_bot_active,
        })

    messages = []
    for m in meeting.messages:
        messages.append({
            "id": m.id,
            "role": m.role.value,
            "speaker_name": m.speaker_name,
            "speaker_user_id": m.speaker_user_id,
            "content": m.content,
            "cited_decisions": m.cited_decisions,
            "sequence": m.sequence,
            "created_at": m.created_at.isoformat(),
        })

    return {
        "id": meeting.id,
        "title": meeting.title,
        "topic": meeting.topic,
        "description": meeting.description,
        "status": meeting.status.value,
        "team_id": meeting.team_id,
        "initiator_id": meeting.initiator_id,
        "initiator_name": meeting.initiator.full_name if meeting.initiator else "Unknown",
        "participant_count": len(participants),
        "created_at": meeting.created_at.isoformat(),
        "started_at": meeting.started_at.isoformat() if meeting.started_at else None,
        "ended_at": meeting.ended_at.isoformat() if meeting.ended_at else None,
        "summary": meeting.summary,
        "consensus_reached": meeting.consensus_reached,
        "action_items": meeting.action_items,
        "participants": participants,
        "messages": messages,
    }


# Endpoints


@router.post("/", response_model=MeetingResponse)
async def create_meeting(
    current_user: CurrentUser,
    db: DbSession,
    data: MeetingCreate,
) -> dict:
    """Create a new bot meeting."""
    # Verify user is team member
    await _verify_team_member(db, data.team_id, current_user.id)

    # Verify all participants are team members
    for user_id in data.participant_ids:
        await _verify_team_member(db, data.team_id, user_id)

    service = get_meeting_service()

    try:
        meeting = await service.create_meeting(
            db=db,
            initiator_id=current_user.id,
            team_id=data.team_id,
            title=data.title,
            topic=data.topic,
            participant_ids=data.participant_ids,
            description=data.description,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Reload with relations
    result = await db.execute(
        select(BotMeeting)
        .options(
            selectinload(BotMeeting.participants),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeeting.id == meeting.id)
    )
    meeting = result.scalar_one()

    return _meeting_to_response(meeting)


@router.get("/", response_model=list[MeetingResponse])
async def list_meetings(
    current_user: CurrentUser,
    db: DbSession,
    team_id: int | None = None,
) -> list[dict]:
    """List meetings for the current user."""
    # Get meetings where user is a participant
    query = (
        select(BotMeeting)
        .join(BotMeetingParticipant)
        .options(
            selectinload(BotMeeting.participants),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeetingParticipant.user_id == current_user.id)
    )

    if team_id:
        query = query.where(BotMeeting.team_id == team_id)

    query = query.order_by(BotMeeting.created_at.desc())

    result = await db.execute(query)
    meetings = result.scalars().unique().all()

    return [_meeting_to_response(m) for m in meetings]


@router.get("/{meeting_id}", response_model=MeetingDetailResponse)
async def get_meeting(
    meeting_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Get meeting details with messages."""
    result = await db.execute(
        select(BotMeeting)
        .options(
            selectinload(BotMeeting.participants).selectinload(BotMeetingParticipant.user),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Verify user is participant or team member
    is_participant = any(p.user_id == current_user.id for p in meeting.participants)
    if not is_participant:
        await _verify_team_member(db, meeting.team_id, current_user.id)

    return _meeting_to_detail_response(meeting)


@router.post("/{meeting_id}/start", response_model=MeetingDetailResponse)
async def start_meeting(
    meeting_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """Start a meeting (begins bot discussion)."""
    # Get meeting first
    result = await db.execute(
        select(BotMeeting)
        .options(selectinload(BotMeeting.participants))
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Verify user is initiator or team admin
    if meeting.initiator_id != current_user.id:
        await _verify_team_member(db, meeting.team_id, current_user.id)

    service = get_meeting_service()

    try:
        await service.start_meeting(db, meeting_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Reload with all relations
    result = await db.execute(
        select(BotMeeting)
        .options(
            selectinload(BotMeeting.participants).selectinload(BotMeetingParticipant.user),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one()

    return _meeting_to_detail_response(meeting)


@router.post("/{meeting_id}/run", response_model=MeetingDetailResponse)
async def run_discussion(
    meeting_id: int,
    current_user: CurrentUser,
    db: DbSession,
    max_turns: int = Query(default=10, le=20),
) -> dict:
    """Run a full discussion round until consensus or max turns."""
    # Get meeting first
    result = await db.execute(
        select(BotMeeting)
        .options(selectinload(BotMeeting.participants))
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Verify user is participant
    is_participant = any(p.user_id == current_user.id for p in meeting.participants)
    if not is_participant:
        raise HTTPException(status_code=403, detail="Not a participant in this meeting")

    service = get_meeting_service()

    try:
        await service.run_discussion_round(db, meeting_id, max_turns=max_turns)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Reload with all relations
    result = await db.execute(
        select(BotMeeting)
        .options(
            selectinload(BotMeeting.participants).selectinload(BotMeetingParticipant.user),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one()

    return _meeting_to_detail_response(meeting)


@router.post("/{meeting_id}/end", response_model=MeetingDetailResponse)
async def end_meeting(
    meeting_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> dict:
    """End a meeting and generate summary."""
    # Get meeting first
    result = await db.execute(
        select(BotMeeting)
        .options(selectinload(BotMeeting.participants))
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Verify user is initiator or admin
    if meeting.initiator_id != current_user.id:
        await _verify_team_member(db, meeting.team_id, current_user.id)

    service = get_meeting_service()

    try:
        await service.end_meeting(db, meeting_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Reload with all relations
    result = await db.execute(
        select(BotMeeting)
        .options(
            selectinload(BotMeeting.participants).selectinload(BotMeetingParticipant.user),
            selectinload(BotMeeting.messages),
            selectinload(BotMeeting.initiator),
        )
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one()

    return _meeting_to_detail_response(meeting)


@router.get("/{meeting_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    meeting_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> list[dict]:
    """Get all messages in a meeting."""
    # Get meeting first to verify access
    result = await db.execute(
        select(BotMeeting)
        .options(selectinload(BotMeeting.participants))
        .where(BotMeeting.id == meeting_id)
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Verify user is participant or team member
    is_participant = any(p.user_id == current_user.id for p in meeting.participants)
    if not is_participant:
        await _verify_team_member(db, meeting.team_id, current_user.id)

    # Get messages
    result = await db.execute(
        select(BotMeetingMessage)
        .where(BotMeetingMessage.meeting_id == meeting_id)
        .order_by(BotMeetingMessage.sequence)
    )
    messages = result.scalars().all()

    return [
        {
            "id": m.id,
            "role": m.role.value,
            "speaker_name": m.speaker_name,
            "speaker_user_id": m.speaker_user_id,
            "content": m.content,
            "cited_decisions": m.cited_decisions,
            "sequence": m.sequence,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]
