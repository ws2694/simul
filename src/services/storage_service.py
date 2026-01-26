"""Storage service for media files."""
import os
import aiofiles
import structlog
from pathlib import Path

from src.config import get_settings

logger = structlog.get_logger()
settings = get_settings()


class StorageService:
    """Service for storing and retrieving media files."""

    def __init__(self):
        self.backend = settings.storage_backend
        self.local_path = Path(settings.local_storage_path)

        if self.backend == "local":
            self.local_path.mkdir(parents=True, exist_ok=True)

    async def save_file(self, file_data: bytes, filename: str, user_id: int) -> str:
        """Save a file and return the storage path."""
        if self.backend == "local":
            return await self._save_local(file_data, filename, user_id)
        elif self.backend == "s3":
            return await self._save_s3(file_data, filename, user_id)
        elif self.backend == "gcs":
            return await self._save_gcs(file_data, filename, user_id)
        else:
            raise ValueError(f"Unknown storage backend: {self.backend}")

    async def _save_local(self, file_data: bytes, filename: str, user_id: int) -> str:
        """Save file to local filesystem."""
        user_dir = self.local_path / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)

        file_path = user_dir / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(file_data)

        return str(file_path)

    async def _save_s3(self, file_data: bytes, filename: str, user_id: int) -> str:
        """Save file to S3."""
        import boto3

        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

        key = f"{user_id}/{filename}"
        s3.put_object(Bucket=settings.storage_bucket, Key=key, Body=file_data)

        return f"s3://{settings.storage_bucket}/{key}"

    async def _save_gcs(self, file_data: bytes, filename: str, user_id: int) -> str:
        """Save file to Google Cloud Storage."""
        from google.cloud import storage

        client = storage.Client()
        bucket = client.bucket(settings.storage_bucket)
        blob = bucket.blob(f"{user_id}/{filename}")
        blob.upload_from_string(file_data)

        return f"gs://{settings.storage_bucket}/{user_id}/{filename}"

    async def get_file(self, path: str) -> bytes:
        """Retrieve a file from storage."""
        if self.backend == "local" or path.startswith("/"):
            async with aiofiles.open(path, "rb") as f:
                return await f.read()
        elif path.startswith("s3://"):
            return await self._get_s3(path)
        elif path.startswith("gs://"):
            return await self._get_gcs(path)
        else:
            raise ValueError(f"Unknown path format: {path}")

    async def _get_s3(self, path: str) -> bytes:
        """Get file from S3."""
        import boto3

        s3 = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
        )

        # Parse s3://bucket/key format
        parts = path.replace("s3://", "").split("/", 1)
        bucket, key = parts[0], parts[1]

        response = s3.get_object(Bucket=bucket, Key=key)
        return response["Body"].read()

    async def _get_gcs(self, path: str) -> bytes:
        """Get file from GCS."""
        from google.cloud import storage

        # Parse gs://bucket/key format
        parts = path.replace("gs://", "").split("/", 1)
        bucket_name, blob_name = parts[0], parts[1]

        client = storage.Client()
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        return blob.download_as_bytes()

    def get_local_path(self, path: str) -> str:
        """Get local filesystem path for a file (downloading if needed)."""
        if self.backend == "local" or path.startswith("/"):
            return path
        # For cloud storage, would need to download to temp file
        raise NotImplementedError("Cloud storage local path not implemented")


# Singleton
_storage_service: StorageService | None = None


def get_storage_service() -> StorageService:
    """Get storage service singleton."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
