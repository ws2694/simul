"""Embedding service for semantic search."""
import structlog
from google import genai

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class EmbeddingService:
    """Service for generating and managing embeddings."""

    def __init__(self):
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = "gemini-embedding-001"
        self.dimensions = 768

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding for a text string."""
        result = await self.client.aio.models.embed_content(
            model=self.model,
            contents=text,
        )
        return result.embeddings[0].values

    async def generate_embeddings_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        result = await self.client.aio.models.embed_content(
            model=self.model,
            contents=texts,
        )
        return [e.values for e in result.embeddings]


# Singleton
_embedding_service: EmbeddingService | None = None


def get_embedding_service() -> EmbeddingService:
    """Get embedding service singleton."""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
