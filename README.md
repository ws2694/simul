# Cognitive State Protocol

Reduce meeting time waste through AI-powered cognitive state capture and retrieval.

## The Problem

Most meetings exist to transfer context that should already be accessible:
- Person A does work → Context lives in their head
- Person B needs context → Schedule meeting
- 30-min meeting → Context transfer happens verbally
- Context still incomplete → Follow-up meeting needed

## The Solution

Capture reasoning automatically, make it queryable:
- **Personal Bots**: Each team member has their own cognitive bot
- **Audio Capture**: Record coding sessions, extract decisions automatically
- **Cross-Team Queries**: Ask anyone's bot instead of scheduling meetings
- **Conflict Detection**: Proactively identify misaligned decisions

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Docker (for PostgreSQL + Redis)
- Google Gemini API key

### Setup

1. Clone and setup:
```bash
cd cognitive-state-protocol
./scripts/setup.sh
```

2. Add your Gemini API key to `.env`:
```bash
GEMINI_API_KEY=your-key-here
```

3. Start development environment:
```bash
./scripts/dev.sh
```

Or use Docker Compose:
```bash
./scripts/docker-dev.sh
```

4. Open:
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│  - Audio Recording     - Query Interface    - Team Dashboard │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (FastAPI)                       │
│  /sessions/upload     /bot/query          /team/{id}/query   │
│  /decisions           /bot/users/{id}     /team/{id}/conflicts│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Gemini 3 Integration                      │
│  gemini-3-pro-preview (audio processing, conflict detection) │
│  gemini-3-flash-preview (queries, quick lookups)             │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                             │
│  PostgreSQL + pgvector (decisions, embeddings)               │
│  Redis (caching)    Local/S3/GCS (audio files)               │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. Audio Recording & Auto-Structuring
Record your coding sessions. The system automatically extracts:
- **Decisions** with full reasoning
- **Alternatives considered** and why they were rejected
- **Confidence levels** based on speaker tone
- **Timestamps** for source attribution

### 2. Personal Bot Queries
```
You: "Why did I use Redis?"

Your Bot: "Based on your Jan 24 coding session:
          [Audio 2:34] 'Need persistence across pod restarts'
          Confidence: 80%
          Alternative considered: Memcached (rejected for K8s support)"
```

### 3. Cross-Team Queries
```
You to Sarah's bot: "Why did you choose Postgres over Mongo?"

Sarah's bot: "From my Jan 15 design meeting:
              [Audio clip] 'Need ACID transactions for payments'
              Status: IMPLEMENTED
              Shared by: Sarah (public)"
```

### 4. Conflict Detection
The system proactively detects when team members make conflicting decisions:
```
⚠️ Weijia's "use Redis for sessions" conflicts with
   Alex's "minimize external dependencies" principle

   Suggested: Sync before implementing
```

### 5. Multi-Person Alignment
Compare reasoning across team members without scheduling meetings:
```
You: "Compare my caching approach with Sarah's and Alex's"

System synthesizes:
- Your approach: Redis for persistence
- Sarah's approach: In-memory with backup
- Alex's constraint: Minimize dependencies
- Recommendation: Discuss Redis as managed service
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/token` - Login and get JWT

### Sessions
- `POST /api/v1/sessions/upload` - Upload audio session
- `GET /api/v1/sessions/` - List your sessions
- `GET /api/v1/sessions/{id}` - Get session details

### Decisions
- `GET /api/v1/decisions/` - List your decisions
- `POST /api/v1/decisions/` - Create manual decision
- `PATCH /api/v1/decisions/{id}` - Update decision

### Personal Bot
- `POST /api/v1/bot/query` - Query your own bot
- `POST /api/v1/bot/users/{user_id}/query` - Query another user's bot
- `GET /api/v1/bot/stats` - Get your cognitive stats

### Team
- `POST /api/v1/team/{team_id}/query` - Query across team
- `GET /api/v1/team/{team_id}/conflicts` - Detect conflicts
- `POST /api/v1/team/{team_id}/alignment` - Check alignment

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT signing key | Required for production |
| `STORAGE_BACKEND` | `local`, `s3`, or `gcs` | `local` |

### Gemini Models Used

| Feature | Model | Why |
|---------|-------|-----|
| Audio extraction | `gemini-3-pro-preview` | Best multimodal, 1M context |
| Personal queries | `gemini-3-flash-preview` | Fast, cost-effective |
| Conflict detection | `gemini-3-pro-preview` | Complex reasoning |
| Embeddings | `text-embedding-004` | Semantic search |

## Development

### Project Structure
```
cognitive-state-protocol/
├── src/
│   ├── api/           # FastAPI endpoints
│   ├── db/            # Database setup
│   ├── models/        # SQLAlchemy models
│   ├── services/      # Core business logic
│   │   ├── audio_processor.py
│   │   ├── personal_bot.py
│   │   ├── team_knowledge_graph.py
│   │   └── gemini_client.py
│   └── main.py        # Application entry
├── frontend/
│   └── src/
│       ├── app/       # Next.js pages
│       ├── components/# React components
│       ├── hooks/     # Custom hooks
│       └── lib/       # API client, store
├── scripts/           # Setup and dev scripts
└── docker-compose.yml
```

### Local Development Setup (Important!)

**Database Connection:**
- Docker exposes PostgreSQL on port **5433** (not 5432)
- The `.env` file in the project root contains `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5433/cognitive_state`
- When running the backend from `src/` directory, the config loads `../.env` (parent directory)

**Starting Services:**

1. Start Docker services (PostgreSQL + Redis):
```bash
docker-compose up -d db redis
```

2. Start backend (from project root):
```bash
cd src
source ../venv/bin/activate
python -m uvicorn main:app --reload --port 8000
```

3. Start frontend:
```bash
cd frontend
npm run dev
```

**Common Issues:**

| Issue | Cause | Solution |
|-------|-------|----------|
| `column "X" does not exist` | Backend connected to wrong DB (port 5432 instead of 5433) | Check `.env` has correct DATABASE_URL with port 5433 |
| Empty page after login | `.next` cache corrupted | Run `rm -rf frontend/.next` and restart |
| Backend can't find `.env` | Running from wrong directory | Run backend from `src/` directory |
| asyncpg prepared statement errors | Stale connection pool after schema change | Restart both database container and backend |

**Verifying Database Connection:**
```bash
# Check what port backend is using
cd src && source ../venv/bin/activate
python -c "from src.config import get_settings; print(get_settings().database_url)"
# Should show: postgresql+asyncpg://postgres:postgres@localhost:5433/cognitive_state

# Check tables exist
docker exec cognitive-state-protocol-db-1 psql -U postgres -d cognitive_state -c "\dt"
```

### Running Tests
```bash
source .venv/bin/activate
pytest tests/
```

### Adding New Features

1. Add database models in `src/models/`
2. Add service logic in `src/services/`
3. Add API endpoints in `src/api/`
4. Add frontend components in `frontend/src/components/`

## Success Metrics

### Personal Bot Success
- User queries their own bot 5+ times/week
- 70% of queries answered without needing to talk to someone
- Users say: "I couldn't remember why I did X, bot reminded me"

### Team Bot Success
- 30% reduction in "context transfer" meetings
- Cross-person queries happen daily
- Users say: "I asked Sarah's bot instead of scheduling time"

### Meeting Replacement Success
- 50% of 1:1s become bot queries instead
- Average meeting length decreases
- Users say: "I only meet when we need to decide, not just to align"

## License

MIT
