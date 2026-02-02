"""Application configuration."""
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API
    app_name: str = "Cognitive State Protocol"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/cognitive_state"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Gemini API
    gemini_api_key: str = ""
    gemini_pro_model: str = "gemini-2.0-flash"
    gemini_flash_model: str = "gemini-2.0-flash"
    gemini_live_model: str = "gemini-2.0-flash"

    # Storage
    storage_backend: str = "local"  # "local", "s3", "gcs"
    storage_bucket: str = "cognitive-state-media"
    local_storage_path: str = "./media"

    # AWS (if using S3)
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "us-east-1"

    # Auth
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week

    # Processing
    max_audio_duration_seconds: int = 7200  # 2 hours
    max_video_size_mb: int = 500
    max_document_size_mb: int = 50
    max_video_duration_seconds: int = 7200  # 2 hours
    chunk_size_mb: int = 20

    # Google OAuth (for Google Docs integration)
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    model_config = {"env_file": "../.env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
