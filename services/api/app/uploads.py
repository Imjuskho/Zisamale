"""File upload handling for CHW photos and documents."""

from __future__ import annotations

import hashlib
import uuid
from pathlib import Path

from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
}


async def save_upload(file: UploadFile, visit_id: str | None = None) -> dict:
    if file.content_type not in ALLOWED_TYPES:
        raise ValueError(f"File type '{file.content_type}' not allowed. Use: {list(ALLOWED_TYPES.keys())}")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError(f"File too large: {len(content)} bytes. Max: {MAX_FILE_SIZE}")

    file_id = str(uuid.uuid4())
    ext = ALLOWED_TYPES.get(file.content_type, ".bin")
    subdir = visit_id or "unassigned"
    upload_path = UPLOAD_DIR / subdir
    upload_path.mkdir(parents=True, exist_ok=True)

    filename = f"{file_id}{ext}"
    filepath = upload_path / filename
    filepath.write_bytes(content)

    checksum = hashlib.sha256(content).hexdigest()

    return {
        "file_id": file_id,
        "filename": filename,
        "path": str(filepath),
        "size_bytes": len(content),
        "content_type": file.content_type,
        "sha256": checksum,
    }


def get_upload_stats() -> dict:
    if not UPLOAD_DIR.exists():
        return {"total_files": 0, "total_size_bytes": 0}
    files = list(UPLOAD_DIR.rglob("*"))
    regular_files = [f for f in files if f.is_file()]
    total_size = sum(f.stat().st_size for f in regular_files)
    return {
        "total_files": len(regular_files),
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
    }
