"""Upload security: magic-byte type checks, embedded-script detection, quarantine.

Fail-closed by design: anything that cannot be positively identified as the
type its extension claims, or that contains script markers, is reported as
unsafe so callers can reject it and route the bytes to quarantine.
"""

from __future__ import annotations

import re
import uuid
from datetime import UTC, datetime
from pathlib import Path

QUARANTINE_DIR = Path("quarantine")

MAGIC_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"%PDF-", "application/pdf"),
)

EXTENSION_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
}

SCRIPT_MARKERS: tuple[bytes, ...] = (
    b"<?php",
    b"<script",
    b"javascript:",
    b"<%",
    b"<?=",
    b"data:text/html",
)

_REASON_SANITIZE_RE = re.compile(r"[^A-Za-z0-9_.-]+")


def detect_mime_type(content: bytes) -> str:
    """Identify content type from magic bytes; 'unknown' when unrecognized."""
    for signature, mime in MAGIC_SIGNATURES:
        if content.startswith(signature):
            return mime
    if len(content) >= 12 and content[:4] == b"RIFF" and content[8:12] == b"WEBP":
        return "image/webp"
    return "unknown"


def validate_image(content: bytes) -> bool:
    """True only for content carrying a real JPEG or PNG header."""
    return content.startswith(b"\xff\xd8\xff") or content.startswith(b"\x89PNG\r\n\x1a\n")


def check_file_size(content: bytes, max_mb: int = 10) -> bool:
    """True when the payload fits within max_mb megabytes."""
    return len(content) <= max_mb * 1024 * 1024


def scan_file(content: bytes, filename: str) -> dict:
    """Inspect an upload and report whether it is safe to persist.

    Returns a dict with detected type, size, and a list of security issues;
    ``safe`` is True only when no issue was found.
    """
    issues: list[str] = []
    detected = detect_mime_type(content)
    extension = Path(filename).suffix.lower()

    if len(content) == 0:
        issues.append("empty_file")
    if detected == "unknown":
        issues.append("unknown_file_type")

    expected = EXTENSION_TYPES.get(extension)
    if expected is not None and expected != detected:
        issues.append("extension_mismatch")

    lowered = content.lower()
    if any(marker in lowered for marker in SCRIPT_MARKERS):
        issues.append("embedded_script")

    if (
        ".." in filename
        or "/" in filename
        or "\\" in filename
        or filename.startswith("~")
    ):
        issues.append("path_traversal_in_filename")

    return {
        "filename": filename,
        "size_bytes": len(content),
        "detected_type": detected,
        "extension": extension,
        "safe": not issues,
        "issues": issues,
    }


def quarantine_suspicious(content: bytes, reason: str) -> str:
    """Persist suspicious bytes to the quarantine directory; returns the path."""
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    safe_reason = _REASON_SANITIZE_RE.sub("_", reason)[:48].strip("_") or "unspecified"
    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S")
    name = f"{stamp}_{safe_reason}_{uuid.uuid4().hex[:8]}.quarantine"
    path = QUARANTINE_DIR / name
    path.write_bytes(content)
    return str(path)
