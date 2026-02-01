"""Shared test fixtures."""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


SAMPLE_EXTRACTION_RESPONSE = {
    "summary": "Discussion about implementing Redis caching for the API layer.",
    "decisions": [
        {
            "decision": "Use Redis for API response caching",
            "reasoning": "Redis provides low-latency in-memory caching with TTL support",
            "alternatives_considered": ["Memcached", "In-process cache"],
            "confidence": 0.85,
            "timestamp_start": 30.0,
            "timestamp_end": 120.0,
            "domain": "infrastructure",
            "tags": ["redis", "caching", "performance"],
        },
        {
            "decision": "Set default TTL to 5 minutes for API responses",
            "reasoning": "Balance between freshness and performance",
            "alternatives_considered": ["1 minute", "15 minutes"],
            "confidence": 0.7,
            "timestamp_start": 150.0,
            "timestamp_end": 200.0,
            "domain": "performance",
            "tags": ["ttl", "caching", "api"],
        },
    ],
    "open_questions": [
        "Should we use Redis Cluster for horizontal scaling?",
        "What eviction policy is best for our workload?",
    ],
    "technologies_mentioned": ["Redis", "FastAPI", "Python", "Docker"],
}


@pytest.fixture
def sample_extraction():
    """Sample extraction response JSON."""
    return SAMPLE_EXTRACTION_RESPONSE.copy()


@pytest.fixture
def mock_db():
    """Mocked async database session."""
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.execute = AsyncMock()
    return db


@pytest.fixture
def mock_gemini():
    """Mocked Gemini client."""
    client = AsyncMock()
    client.upload_file = AsyncMock(return_value="gs://bucket/file.mp3")
    client.generate_with_audio = AsyncMock()
    client.generate_with_video = AsyncMock()
    client.generate_with_document_text = AsyncMock()
    client.generate_content = AsyncMock()
    return client


@pytest.fixture
def mock_embeddings():
    """Mocked embedding service."""
    service = AsyncMock()
    service.generate_embedding = AsyncMock(return_value=[0.1] * 768)
    return service


@pytest.fixture
def mock_storage():
    """Mocked storage service."""
    service = AsyncMock()
    service.save_file = AsyncMock(return_value="/media/1/test_file.pdf")
    service.get_file = AsyncMock(return_value=b"test content")
    return service
