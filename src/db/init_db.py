"""Database initialization."""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import Base
from src.db.session import engine


async def init_db() -> None:
    """Initialize database with tables and extensions."""
    import structlog
    logger = structlog.get_logger()

    # Try to enable pgvector extension in a separate transaction
    try:
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            logger.info("pgvector extension enabled")
    except Exception as e:
        logger.warning("pgvector extension not available - semantic search will be disabled", error=str(e))

    # Create all tables in a new transaction
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created")


async def create_initial_data(db: AsyncSession) -> None:
    """Create initial data if needed."""
    # Add any initial data creation here
    pass
