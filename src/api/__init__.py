"""API router initialization."""
from fastapi import APIRouter

from src.api.auth import router as auth_router
from src.api.users import router as users_router
from src.api.sessions import router as sessions_router
from src.api.decisions import router as decisions_router
from src.api.bot import router as bot_router
from src.api.team import router as team_router
from src.api.google_auth import router as google_auth_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(sessions_router, prefix="/sessions", tags=["sessions"])
api_router.include_router(decisions_router, prefix="/decisions", tags=["decisions"])
api_router.include_router(bot_router, prefix="/bot", tags=["bot"])
api_router.include_router(team_router, prefix="/team", tags=["team"])
api_router.include_router(google_auth_router, prefix="/google", tags=["google"])
