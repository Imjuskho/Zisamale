"""Audit logging middleware.

Audit must never break the request path: every failure inside the audit
pipeline (token decode, DB write) is contained and reported through
structured logging instead of propagating to the caller.
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from datetime import UTC, datetime

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("zisamale.audit")

# Paths that carry no audit value and would only add noise.
EXCLUDED_PATHS = frozenset({"/health", "/docs", "/redoc", "/openapi.json"})
AUDITED_METHODS = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _structured(event: str, **fields: object) -> str:
    payload = {
        "event": event,
        "timestamp": datetime.now(UTC).isoformat(),
        **fields,
    }
    return json.dumps(payload, default=str)


class AuditLogMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        started = time.perf_counter()
        status_code = 500
        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        finally:
            await self._record(request, status_code, started)

    async def _record(self, request: Request, status_code: int, started: float) -> None:
        try:
            if request.method not in AUDITED_METHODS or request.url.path in EXCLUDED_PATHS:
                return

            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            user_id = self._extract_user_id(request)

            fields = {
                "user_id": user_id,
                "action": f"{request.method} {request.url.path}",
                "method": request.method,
                "path": request.url.path,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "entity_type": _extract_entity_type(request.url.path),
                "entity_id": _extract_entity_id(request.url.path),
                "ip_address": request.client.host if request.client else None,
                "user_agent": request.headers.get("User-Agent"),
            }

            # Structured log line first: survives even if the DB is down.
            logger.info(_structured("audit", **fields))

            await self._persist(fields)
        except Exception:
            # Audit failures must never crash the main request.
            logger.warning(
                _structured(
                    "audit_write_failed",
                    path=request.url.path,
                    method=request.method,
                ),
                exc_info=True,
            )

    @staticmethod
    def _extract_user_id(request: Request) -> str | None:
        try:
            from app.auth import decode_token

            auth = request.headers.get("Authorization", "")
            if not auth.startswith("Bearer "):
                return None
            payload = decode_token(auth[7:])
            return payload.get("sub") if payload else None
        except Exception:
            return None

    @staticmethod
    async def _persist(fields: dict) -> None:
        try:
            from app.database import async_session
            from app.models.audit import AuditLog

            async with async_session() as session:
                session.add(
                    AuditLog(
                        log_id=str(uuid.uuid4()),
                        user_id=fields["user_id"],
                        action=fields["action"],
                        entity_type=fields["entity_type"],
                        entity_id=fields["entity_id"],
                        ip_address=fields["ip_address"],
                        user_agent=fields["user_agent"],
                    )
                )
                await session.commit()
        except Exception as exc:
            logger.warning(
                _structured(
                    "audit_db_unavailable",
                    action=fields.get("action"),
                    error=f"{type(exc).__name__}: {exc}",
                )
            )


def _extract_entity_type(path: str) -> str:
    parts = path.strip("/").split("/")
    if len(parts) >= 3:
        return parts[2] if len(parts) > 2 else "unknown"
    return "unknown"


def _extract_entity_id(path: str) -> str | None:
    parts = path.strip("/").split("/")
    if len(parts) >= 4:
        candidate = parts[3]
        try:
            import uuid as _uuid

            _uuid.UUID(candidate)
            return candidate
        except (ValueError, AttributeError):
            return None
    return None
