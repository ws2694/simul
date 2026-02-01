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
                        "description": "The decision made, stated clearly",
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Why this decision was made",
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
                        "description": "Category: architecture, infrastructure, security, performance, etc.",
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
            "description": "Technologies, frameworks, tools mentioned",
        },
    },
    "required": ["summary", "decisions", "open_questions", "technologies_mentioned"],
}


AUDIO_EXTRACTION_PROMPT = """Analyze this coding/working session audio recording. Your task is to extract all technical decisions, reasoning, and context.

For each decision you identify:
1. State the decision clearly and concisely
2. Capture the full reasoning - WHY was this decision made?
3. List any alternatives that were considered and rejected
4. Rate confidence based on the speaker's tone and certainty (0.0 = very uncertain, 1.0 = very confident)
5. Provide accurate timestamps (in seconds) for when the decision was discussed
6. Classify the domain (architecture, infrastructure, security, performance, database, api, frontend, testing, devops, etc.)
7. Add relevant tags for searchability

Also extract:
- Open questions or uncertainties the speaker expressed
- Technologies, frameworks, libraries, and tools mentioned

Focus on capturing the REASONING and CONTEXT, not just the decisions themselves. The goal is to make this knowledge queryable later.

Be thorough - even small decisions can be important for understanding the codebase later."""


VIDEO_EXTRACTION_PROMPT = """Analyze this video recording of a coding/working session. Your task is to extract all technical decisions, reasoning, and context from both the visual and audio content.

Pay special attention to:
- Screen recordings showing code being written, edited, or reviewed
- Diagrams, flowcharts, or architectural sketches shown on screen or whiteboard
- Terminal/console output demonstrating tool choices or configurations
- Code on screen that reveals implementation decisions
- Non-verbal cues: highlighting, cursor movements indicating focus areas
- Any slides or documentation shown during the session

For each decision you identify:
1. State the decision clearly and concisely
2. Capture the full reasoning - WHY was this decision made? Include visual context (e.g., "as shown in the diagram at timestamp X")
3. List any alternatives that were considered and rejected
4. Rate confidence based on both spoken tone and visual emphasis (0.0 = very uncertain, 1.0 = very confident)
5. Provide accurate timestamps (in seconds) for when the decision was discussed or shown
6. Classify the domain (architecture, infrastructure, security, performance, database, api, frontend, testing, devops, etc.)
7. Add relevant tags for searchability

Also extract:
- Open questions or uncertainties expressed verbally or shown as TODOs/FIXMEs on screen
- Technologies, frameworks, libraries, and tools visible on screen or mentioned verbally

Focus on capturing the REASONING and CONTEXT from both visual and spoken content. The goal is to make this knowledge queryable later.

Be thorough - even small decisions visible in code or diagrams can be important for understanding the codebase later."""


DOCUMENT_EXTRACTION_PROMPT = """Analyze this written document (RFC, proposal, design doc, meeting notes, or technical specification). Your task is to extract all technical decisions, reasoning, and context.

Pay special attention to:
- Explicit decisions stated in the document ("We decided...", "The approach will be...", "We chose...")
- Implicit decisions revealed by the document structure and content
- Language patterns indicating confidence levels: "we decided" / "we will" (high) vs "we might" / "we could" / "TBD" (low)
- Section references and paragraph context for traceability
- Alternatives discussed and reasons for rejection
- Open items, action items, and unresolved questions

For each decision you identify:
1. State the decision clearly and concisely
2. Capture the full reasoning - WHY was this decision made? Reference specific sections or paragraphs
3. List any alternatives that were considered and rejected
4. Rate confidence based on language certainty (0.0 = tentative/proposed, 1.0 = definitive/approved)
5. Use section/paragraph numbers for timestamp_start and timestamp_end (use 0 if no clear section)
6. Classify the domain (architecture, infrastructure, security, performance, database, api, frontend, testing, devops, etc.)
7. Add relevant tags for searchability

Also extract:
- Open questions, TBDs, or unresolved items in the document
- Technologies, frameworks, libraries, and tools mentioned

Focus on capturing the REASONING and CONTEXT behind each decision. The goal is to make this knowledge queryable later.

Be thorough - even minor decisions in technical documents can have significant downstream impact."""
