"""User management endpoints."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import select

from src.api.deps import CurrentUser, DbSession
from src.models import User

router = APIRouter()


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    is_active: bool
    bot_enabled: bool
    default_visibility: str

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    bot_enabled: bool | None = None
    default_visibility: str | None = None


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser) -> User:
    """Get current user information."""
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    current_user: CurrentUser,
    db: DbSession,
    user_update: UserUpdate,
) -> User:
    """Update current user settings."""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.bot_enabled is not None:
        current_user.bot_enabled = user_update.bot_enabled
    if user_update.default_visibility is not None:
        if user_update.default_visibility not in ["private", "team", "public"]:
            raise HTTPException(status_code=400, detail="Invalid visibility level")
        current_user.default_visibility = user_update.default_visibility

    await db.commit()
    await db.refresh(current_user)

    return current_user


class UserSearchResponse(BaseModel):
    id: int
    email: str
    full_name: str

    model_config = {"from_attributes": True}


@router.get("/search/", response_model=list[UserSearchResponse])
async def search_users(
    current_user: CurrentUser,
    db: DbSession,
    q: str = "",
    limit: int = 10,
) -> list[User]:
    """Search users by email or name. Used for adding team members."""
    if not q or len(q) < 2:
        return []

    query = select(User).where(
        User.is_active == True,  # noqa: E712
        (User.email.ilike(f"%{q}%") | User.full_name.ilike(f"%{q}%")),
    ).limit(limit)

    result = await db.execute(query)
    users = result.scalars().all()

    # Exclude current user from results
    return [u for u in users if u.id != current_user.id]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> User:
    """Get a specific user's public info."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user
