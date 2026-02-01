"""Bot meeting service for orchestrating bot-to-bot discussions."""
import json
import time
from datetime import datetime
from typing import Optional

import structlog
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models import (
    BotMeeting,
    BotMeetingParticipant,
    BotMeetingMessage,
    MeetingStatus,
    MessageRole,
    Decision,
    User,
    TeamMembership,
    VisibilityLevel,
)
from src.services.gemini_client import get_gemini_client
from src.services.meeting_prompts import (
    BOT_SPEAKER_PROMPT,
    FACILITATOR_OPENING_PROMPT,
    FACILITATOR_GUIDE_PROMPT,
    FACILITATOR_SYNTHESIS_PROMPT,
    MEETING_SUMMARY_PROMPT,
    MEETING_SUMMARY_SCHEMA,
)

logger = structlog.get_logger()


class BotMeetingService:
    """Service for orchestrating bot-to-bot meeting conversations."""

    def __init__(self):
        self.gemini = get_gemini_client()

    async def create_meeting(
        self,
        db: AsyncSession,
        initiator_id: int,
        team_id: int,
        title: str,
        topic: str,
        participant_ids: list[int],
        description: str | None = None,
    ) -> BotMeeting:
        """Create a new bot meeting with specified participants."""
        # Verify initiator is in participant list
        if initiator_id not in participant_ids:
            participant_ids.append(initiator_id)

        # Verify all participants are team members
        for user_id in participant_ids:
            membership = await db.execute(
                select(TeamMembership).where(
                    and_(
                        TeamMembership.team_id == team_id,
                        TeamMembership.user_id == user_id,
                    )
                )
            )
            if not membership.scalar_one_or_none():
                raise ValueError(f"User {user_id} is not a member of the team")

        # Create meeting
        meeting = BotMeeting(
            title=title,
            topic=topic,
            description=description,
            team_id=team_id,
            initiator_id=initiator_id,
            status=MeetingStatus.SCHEDULED,
        )
        db.add(meeting)
        await db.flush()

        # Add participants
        for user_id in participant_ids:
            participant = BotMeetingParticipant(
                meeting_id=meeting.id,
                user_id=user_id,
                joined_at=datetime.utcnow(),
            )
            db.add(participant)

        await db.commit()
        await db.refresh(meeting)

        logger.info(
            "meeting_created",
            meeting_id=meeting.id,
            team_id=team_id,
            participant_count=len(participant_ids),
        )

        return meeting

    async def start_meeting(
        self,
        db: AsyncSession,
        meeting_id: int,
    ) -> BotMeeting:
        """Start a meeting and generate the facilitator's opening."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status != MeetingStatus.SCHEDULED:
            raise ValueError(f"Meeting is already {meeting.status.value}")

        # Update status
        meeting.status = MeetingStatus.IN_PROGRESS
        meeting.started_at = datetime.utcnow()

        # Get participant names
        participants_info = await self._get_participants_info(db, meeting)

        # Generate facilitator opening
        opening_prompt = FACILITATOR_OPENING_PROMPT.format(
            topic=meeting.topic,
            description=meeting.description or "No additional description provided.",
            participants="\n".join(
                [f"- {p['name']}'s Bot" for p in participants_info]
            ),
        )

        opening = await self.gemini.generate_content(
            prompt=opening_prompt,
            model=self.gemini.flash_model,
        )

        # Save facilitator message
        message = BotMeetingMessage(
            meeting_id=meeting.id,
            role=MessageRole.FACILITATOR,
            speaker_name="Facilitator",
            content=opening,
            sequence=1,
        )
        db.add(message)

        await db.commit()
        await db.refresh(meeting)

        logger.info("meeting_started", meeting_id=meeting.id)

        return meeting

    async def generate_bot_response(
        self,
        db: AsyncSession,
        meeting_id: int,
        user_id: int,
    ) -> BotMeetingMessage:
        """Generate a response from a specific user's bot."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status != MeetingStatus.IN_PROGRESS:
            raise ValueError("Meeting is not in progress")

        # Verify user is a participant
        participant = next(
            (p for p in meeting.participants if p.user_id == user_id), None
        )
        if not participant:
            raise ValueError("User is not a participant in this meeting")

        # Get user info
        user = await db.get(User, user_id)
        if not user:
            raise ValueError("User not found")

        # Get user's relevant decisions
        decisions = await self._get_user_decisions_for_topic(
            db, user_id, meeting.topic
        )
        decisions_context = self._format_decisions_context(decisions)

        # Get conversation history
        conversation_history = self._format_conversation_history(meeting.messages)

        # Get current message sequence
        next_sequence = len(meeting.messages) + 1

        # Generate bot response
        prompt = BOT_SPEAKER_PROMPT.format(
            user_name=user.full_name,
            topic=meeting.topic,
            meeting_context=meeting.description or "No additional context.",
            decisions_context=decisions_context or "No relevant decisions captured.",
            conversation_history=conversation_history,
        )

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.flash_model,
        )

        # Extract cited decision IDs
        cited_ids = [d.id for d in decisions[:5]]  # Cite up to 5 decisions

        # Save message
        message = BotMeetingMessage(
            meeting_id=meeting.id,
            role=MessageRole.BOT,
            speaker_user_id=user_id,
            speaker_name=f"{user.full_name}'s Bot",
            content=response,
            cited_decisions=cited_ids if cited_ids else None,
            sequence=next_sequence,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)

        logger.info(
            "bot_response_generated",
            meeting_id=meeting.id,
            user_id=user_id,
            sequence=next_sequence,
        )

        return message

    async def generate_facilitator_message(
        self,
        db: AsyncSession,
        meeting_id: int,
        is_synthesis: bool = False,
    ) -> BotMeetingMessage:
        """Generate a facilitator message to guide or synthesize the discussion."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status != MeetingStatus.IN_PROGRESS:
            raise ValueError("Meeting is not in progress")

        participants_info = await self._get_participants_info(db, meeting)
        conversation_history = self._format_conversation_history(meeting.messages)

        if is_synthesis:
            prompt = FACILITATOR_SYNTHESIS_PROMPT.format(
                topic=meeting.topic,
                conversation_history=conversation_history,
            )
        else:
            prompt = FACILITATOR_GUIDE_PROMPT.format(
                topic=meeting.topic,
                participants="\n".join(
                    [f"- {p['name']}'s Bot" for p in participants_info]
                ),
                conversation_history=conversation_history,
            )

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.flash_model,
        )

        next_sequence = len(meeting.messages) + 1

        message = BotMeetingMessage(
            meeting_id=meeting.id,
            role=MessageRole.FACILITATOR,
            speaker_name="Facilitator",
            content=response,
            sequence=next_sequence,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)

        return message

    async def run_discussion_round(
        self,
        db: AsyncSession,
        meeting_id: int,
        max_turns: int = 10,
    ) -> list[BotMeetingMessage]:
        """Run a full discussion round with all bot participants."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status == MeetingStatus.SCHEDULED:
            meeting = await self.start_meeting(db, meeting_id)
            # Refresh to get the opening message
            meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status != MeetingStatus.IN_PROGRESS:
            raise ValueError("Meeting is not in progress")

        new_messages = []
        participants = [p.user_id for p in meeting.participants]
        turn_count = 0

        while turn_count < max_turns:
            # Each round: all bots speak once, then facilitator guides
            for user_id in participants:
                if turn_count >= max_turns:
                    break

                # Generate bot response
                msg = await self.generate_bot_response(db, meeting_id, user_id)
                new_messages.append(msg)
                turn_count += 1

            if turn_count >= max_turns:
                break

            # Facilitator guides after each full round
            # Check if we should synthesize (after 2+ rounds)
            is_synthesis = turn_count >= len(participants) * 2
            facilitator_msg = await self.generate_facilitator_message(
                db, meeting_id, is_synthesis=is_synthesis
            )
            new_messages.append(facilitator_msg)

            # If synthesis was generated, we're done
            if is_synthesis:
                break

        logger.info(
            "discussion_round_complete",
            meeting_id=meeting_id,
            messages_generated=len(new_messages),
        )

        return new_messages

    async def generate_summary(
        self,
        db: AsyncSession,
        meeting_id: int,
    ) -> dict:
        """Generate a meeting summary with action items."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        conversation_history = self._format_conversation_history(meeting.messages)

        prompt = MEETING_SUMMARY_PROMPT.format(
            topic=meeting.topic,
            description=meeting.description or "No additional description.",
            conversation_history=conversation_history,
        )

        response = await self.gemini.generate_content(
            prompt=prompt,
            model=self.gemini.flash_model,
            response_schema=MEETING_SUMMARY_SCHEMA,
        )

        try:
            summary_data = json.loads(response)
        except json.JSONDecodeError:
            summary_data = {
                "key_points": [],
                "agreements": [],
                "disagreements": [],
                "consensus_reached": False,
                "action_items": [],
                "open_questions": [],
            }

        return summary_data

    async def end_meeting(
        self,
        db: AsyncSession,
        meeting_id: int,
    ) -> BotMeeting:
        """End a meeting and generate final summary."""
        meeting = await self._get_meeting_with_relations(db, meeting_id)

        if meeting.status not in [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS]:
            raise ValueError(f"Cannot end meeting with status {meeting.status.value}")

        # Generate summary
        summary_data = await self.generate_summary(db, meeting_id)

        # Format summary as text
        summary_parts = ["## Meeting Summary\n"]

        if summary_data.get("key_points"):
            summary_parts.append("### Key Discussion Points")
            for point in summary_data["key_points"]:
                summary_parts.append(f"- {point}")
            summary_parts.append("")

        if summary_data.get("agreements"):
            summary_parts.append("### Areas of Agreement")
            for item in summary_data["agreements"]:
                summary_parts.append(f"- {item}")
            summary_parts.append("")

        if summary_data.get("disagreements"):
            summary_parts.append("### Areas of Disagreement")
            for item in summary_data["disagreements"]:
                summary_parts.append(f"- {item}")
            summary_parts.append("")

        if summary_data.get("action_items"):
            summary_parts.append("### Action Items")
            for item in summary_data["action_items"]:
                owner = item.get("owner", "Team")
                summary_parts.append(f"- {item['action']} ({owner})")
            summary_parts.append("")

        if summary_data.get("open_questions"):
            summary_parts.append("### Open Questions")
            for q in summary_data["open_questions"]:
                summary_parts.append(f"- {q}")

        # Update meeting
        meeting.status = MeetingStatus.COMPLETED
        meeting.ended_at = datetime.utcnow()
        meeting.summary = "\n".join(summary_parts)
        meeting.consensus_reached = summary_data.get("consensus_reached", False)
        meeting.action_items = summary_data.get("action_items", [])

        await db.commit()
        await db.refresh(meeting)

        logger.info(
            "meeting_ended",
            meeting_id=meeting.id,
            consensus_reached=meeting.consensus_reached,
        )

        return meeting

    async def _get_meeting_with_relations(
        self,
        db: AsyncSession,
        meeting_id: int,
    ) -> BotMeeting:
        """Get meeting with all related data loaded."""
        result = await db.execute(
            select(BotMeeting)
            .options(
                selectinload(BotMeeting.participants),
                selectinload(BotMeeting.messages),
                selectinload(BotMeeting.initiator),
            )
            .where(BotMeeting.id == meeting_id)
        )
        meeting = result.scalar_one_or_none()
        if not meeting:
            raise ValueError(f"Meeting {meeting_id} not found")
        return meeting

    async def _get_participants_info(
        self,
        db: AsyncSession,
        meeting: BotMeeting,
    ) -> list[dict]:
        """Get info about meeting participants."""
        participants = []
        for p in meeting.participants:
            user = await db.get(User, p.user_id)
            if user:
                participants.append({
                    "id": user.id,
                    "name": user.full_name,
                    "bot_enabled": user.bot_enabled,
                })
        return participants

    async def _get_user_decisions_for_topic(
        self,
        db: AsyncSession,
        user_id: int,
        topic: str,
        limit: int = 10,
    ) -> list[Decision]:
        """Get user's decisions relevant to the meeting topic.

        When a bot speaks on behalf of a user, it has access to ALL of that
        user's decisions (including private ones), since the bot represents
        the user in the meeting.
        """
        # Search for decisions matching the topic
        topic_lower = topic.lower()
        search_terms = topic_lower.split()[:5]

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

        # Get ALL decisions owned by the user (including private)
        # The bot represents the user, so it can access all their knowledge
        owner_filter = Decision.owner_id == user_id

        if text_conditions:
            search_filter = or_(*text_conditions)
            result = await db.execute(
                select(Decision)
                .where(owner_filter)
                .where(search_filter)
                .order_by(Decision.created_at.desc())
                .limit(limit)
            )
        else:
            # If no topic match, get most recent decisions
            result = await db.execute(
                select(Decision)
                .where(owner_filter)
                .order_by(Decision.created_at.desc())
                .limit(limit)
            )

        return list(result.scalars().all())

    def _format_decisions_context(self, decisions: list[Decision]) -> str:
        """Format decisions as context for the LLM."""
        if not decisions:
            return ""

        parts = []
        for i, d in enumerate(decisions, 1):
            parts.append(f"""
Decision {i}: {d.title}
Date: {d.created_at.strftime('%Y-%m-%d')}
Domain: {d.domain}
Confidence: {d.confidence:.0%}
Decision: {d.decision_text}
Reasoning: {d.reasoning}
""")
        return "\n---\n".join(parts)

    def _format_conversation_history(
        self,
        messages: list[BotMeetingMessage],
    ) -> str:
        """Format conversation history for prompts."""
        if not messages:
            return "No messages yet."

        parts = []
        for msg in messages:
            role_prefix = (
                "[FACILITATOR]"
                if msg.role == MessageRole.FACILITATOR
                else f"[{msg.speaker_name}]"
            )
            parts.append(f"{role_prefix}: {msg.content}")

        return "\n\n".join(parts)


# Singleton instance
_meeting_service: BotMeetingService | None = None


def get_meeting_service() -> BotMeetingService:
    """Get the bot meeting service singleton."""
    global _meeting_service
    if _meeting_service is None:
        _meeting_service = BotMeetingService()
    return _meeting_service
