"""Tailored extraction prompts for different media types."""

# Shared JSON schema for Gemini structured output
EXTRACTION_SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string", "description": "Brief summary of the session"},
        "decisions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "decision": {
                        "type": "string",
                        "description": "The decision, thought, insight, or change stated clearly",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Why this decision was made or the context behind this thought",
                    },
                    "alternatives_considered": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Other options that were considered",
                    },
                    "confidence": {
                        "type": "number",
                        "description": "How confident the speaker sounded (0.0-1.0)",
                    },
                    "timestamp_start": {
                        "type": "number",
                        "description": "Start time in seconds (or section number for documents)",
                    },
                    "timestamp_end": {
                        "type": "number",
                        "description": "End time in seconds (or section number for documents)",
                    },
                    "domain": {
                        "type": "string",
                        "description": "Category: strategy, product, engineering, design, marketing, operations, finance, hr, legal, research, planning, process, communication, other",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Relevant tags/keywords",
                    },
                },
                "required": [
                    "decision",
                    "reasoning",
                    "confidence",
                    "timestamp_start",
                    "timestamp_end",
                    "domain",
                ],
            },
        },
        "open_questions": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Unresolved questions or uncertainties expressed",
        },
        "technologies_mentioned": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Technologies, tools, concepts, or key terms mentioned",
        },
    },
    "required": ["summary", "decisions", "open_questions", "technologies_mentioned"],
}


AUDIO_EXTRACTION_PROMPT = """Analyze this audio recording. Your task is to extract ALL decisions, thoughts, insights, ideas, and changes discussed - whether they are about business, strategy, product, engineering, operations, or any other topic.

This could be a meeting, brainstorm, discussion, presentation, or any conversation. Extract EVERYTHING meaningful.

For each decision, thought, or insight you identify:
1. State it clearly and concisely
2. Capture the full reasoning - WHY was this decided or thought? What's the context?
3. List any alternatives that were considered
4. Rate confidence based on the speaker's tone and certainty (0.0 = very uncertain, 1.0 = very confident)
5. Provide accurate timestamps (in seconds) for when it was discussed
6. Classify the domain: strategy, product, engineering, design, marketing, operations, finance, hr, legal, research, planning, process, communication, or other
7. Add relevant tags for searchability

Also extract:
- Open questions, action items, or uncertainties expressed
- Key concepts, tools, names, or important terms mentioned

IMPORTANT: Extract ALL meaningful content, not just technical decisions. Include:
- Strategic directions and business decisions
- Product ideas and feature discussions
- Process changes and workflow decisions
- Team decisions and organizational changes
- Ideas, hypotheses, and theories discussed
- Problems identified and proposed solutions
- Any commitments or agreements made

Focus on capturing the REASONING and CONTEXT. The goal is to preserve team knowledge so it can be queried later.

Be thorough - capture everything that could be valuable for the team to remember."""


VIDEO_EXTRACTION_PROMPT = """Analyze this video recording. Your task is to extract ALL decisions, thoughts, insights, ideas, and changes from both the visual and audio content.

This could be a meeting recording, presentation, brainstorm, screen share, or any video. Extract EVERYTHING meaningful.

Pay special attention to:
- Content shown on screen (slides, documents, diagrams, code, data)
- Whiteboard sketches, drawings, or visual explanations
- Demonstrations or walkthroughs
- Non-verbal cues: highlighting, gestures, emphasis
- Any visual aids or materials presented

For each decision, thought, or insight you identify:
1. State it clearly and concisely
2. Capture the full reasoning - WHY was this decided? Include visual context when relevant
3. List any alternatives that were considered
4. Rate confidence based on spoken tone and visual emphasis (0.0 = very uncertain, 1.0 = very confident)
5. Provide accurate timestamps (in seconds) for when it was discussed or shown
6. Classify the domain: strategy, product, engineering, design, marketing, operations, finance, hr, legal, research, planning, process, communication, or other
7. Add relevant tags for searchability

Also extract:
- Open questions, action items, or TODOs shown or mentioned
- Key concepts, tools, names, or important terms

IMPORTANT: Extract ALL meaningful content from both audio and visual elements:
- Strategic directions and business decisions
- Product ideas and feature discussions
- Process changes and workflow decisions
- Ideas, hypotheses, and theories discussed
- Problems identified and proposed solutions
- Any commitments or agreements made

Focus on capturing the REASONING and CONTEXT. The goal is to preserve team knowledge.

Be thorough - capture everything valuable from both what is said and what is shown."""


DOCUMENT_EXTRACTION_PROMPT = """Analyze this document. Your task is to extract ALL decisions, thoughts, insights, ideas, and changes - whether about business, strategy, product, engineering, or any other topic.

This could be meeting notes, a proposal, a report, an email thread, a plan, or any written content. Extract EVERYTHING meaningful.

Pay special attention to:
- Explicit decisions ("We decided...", "The approach will be...", "We chose...")
- Implicit decisions revealed by the content
- Language indicating confidence: "we decided" / "we will" (high) vs "we might" / "TBD" (low)
- Alternatives discussed and reasons for rejection
- Action items, next steps, and assignments
- Open items and unresolved questions

For each decision, thought, or insight you identify:
1. State it clearly and concisely
2. Capture the full reasoning - WHY was this decided? Reference context when helpful
3. List any alternatives that were considered
4. Rate confidence based on language certainty (0.0 = tentative/proposed, 1.0 = definitive/approved)
5. Use section/paragraph numbers for timestamp_start and timestamp_end (use 0 if no clear section)
6. Classify the domain: strategy, product, engineering, design, marketing, operations, finance, hr, legal, research, planning, process, communication, or other
7. Add relevant tags for searchability

Also extract:
- Open questions, TBDs, action items, or unresolved items
- Key concepts, tools, names, or important terms mentioned

IMPORTANT: Extract ALL meaningful content:
- Strategic directions and business decisions
- Product ideas and feature discussions
- Process changes and workflow decisions
- Team decisions and organizational changes
- Ideas, hypotheses, and theories discussed
- Problems identified and proposed solutions
- Any commitments or agreements made

Focus on capturing the REASONING and CONTEXT. The goal is to preserve team knowledge.

Be thorough - capture everything that could be valuable for the team to remember."""
