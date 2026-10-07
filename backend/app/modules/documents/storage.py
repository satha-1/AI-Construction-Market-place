from pathlib import Path
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

LOCAL_ROOT = Path(__file__).resolve().parents[3] / "uploads"


def _client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint_url,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(s3={"addressing_style": "path"}),
    )


def ensure_bucket() -> None:
    client = _client()
    try:
        client.head_bucket(Bucket=settings.s3_bucket)
    except (ClientError, BotoCoreError):
        client.create_bucket(Bucket=settings.s3_bucket)


def _local_path(key: str) -> Path:
    LOCAL_ROOT.mkdir(parents=True, exist_ok=True)
    return LOCAL_ROOT / key


def upload_bytes(data: bytes, *, content_type: str, suffix: str) -> str:
    key = f"{uuid4()}{suffix}"
    try:
        ensure_bucket()
        _client().put_object(
            Bucket=settings.s3_bucket,
            Key=key,
            Body=data,
            ContentType=content_type,
        )
        return key
    except Exception:
        path = _local_path(key)
        path.write_bytes(data)
        return f"local://{key}"


def download_bytes(storage_path: str) -> bytes:
    if storage_path.startswith("local://"):
        key = storage_path.removeprefix("local://")
        return _local_path(key).read_bytes()
    try:
        obj = _client().get_object(Bucket=settings.s3_bucket, Key=storage_path)
        return obj["Body"].read()
    except Exception:
        # Fall back if the object was stored locally after S3 failure.
        local = _local_path(storage_path)
        if local.exists():
            return local.read_bytes()
        raise
