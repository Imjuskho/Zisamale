"""Structured security audit logging.

Every event is emitted as a single JSON line to stdout so log shippers
(Fluentd/ELK, CloudWatch agent) can ingest it without parsing rules.
Logging never raises: a serialization failure degrades to a best-effort
line instead of breaking the caller's request path.
"""

from __future__ import annotations

import json
import sys
from datetime import UTC, datetime
from typing import Any


def _emit(event: str, fields: dict[str, Any]) -> None:
    payload = {"event": event, "timestamp": datetime.now(UTC).isoformat(), **fields}
    try:
        line = json.dumps(payload, default=str)
    except (TypeError, ValueError):
        line = json.dumps(
            {
                "event": event,
                "timestamp": datetime.now(UTC).isoformat(),
                "serialization_error": True,
            }
        )
    sys.stdout.write(line + "\n")
    sys.stdout.flush()


def log_auth_event(
    event_type: str,
    user_id: str | None,
    ip: str | None,
    success: bool,
    details: dict[str, Any] | None = None,
) -> None:
    """Log login/logout/token-issuance/refresh events."""
    _emit(
        "auth_event",
        {
            "event_type": event_type,
            "user_id": user_id,
            "ip": ip,
            "success": success,
            "details": details or {},
        },
    )


def log_data_access(
    user_id: str | None,
    resource_type: str,
    resource_id: str | None,
    action: str,
) -> None:
    """Log reads/writes of patient-level data for privacy compliance."""
    _emit(
        "data_access",
        {
            "user_id": user_id,
            "resource_type": resource_type,
            "resource_id": resource_id,
            "action": action,
        },
    )


def log_security_event(
    event_type: str,
    ip: str | None,
    details: dict[str, Any] | None = None,
) -> None:
    """Log detected attacks and anomalies (injection attempts, rate abuse)."""
    _emit(
        "security_event",
        {"event_type": event_type, "ip": ip, "details": details or {}},
    )


def log_api_call(
    method: str,
    path: str,
    user_id: str | None,
    status_code: int,
    duration_ms: float,
) -> None:
    """Log every API call with latency for monitoring and forensics."""
    _emit(
        "api_call",
        {
            "method": method,
            "path": path,
            "user_id": user_id,
            "status_code": status_code,
            "duration_ms": round(duration_ms, 2),
        },
    )
