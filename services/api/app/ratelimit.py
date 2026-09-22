"""Rate limiting middleware using in-memory sliding window."""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

RATE_LIMITS = {
    "chw": {"requests": 500, "window_seconds": 60},
    "dho": {"requests": 1000, "window_seconds": 60},
    "mohp": {"requests": 2000, "window_seconds": 60},
    "default": {"requests": 500, "window_seconds": 60},
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_key(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _get_role(self, request: Request) -> str:
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return "default"
        from app.auth import decode_token

        token = auth[7:]
        payload = decode_token(token)
        if payload:
            return payload.get("role", "default")
        return "default"

    async def dispatch(self, request: Request, call_next):
        if request.url.path in ("/health", "/docs", "/redoc", "/openapi.json"):
            return await call_next(request)

        client_key = self._get_client_key(request)
        role = self._get_role(request)
        key = f"{client_key}:{role}"

        now = time.time()
        limit_config = RATE_LIMITS.get(role, RATE_LIMITS["default"])
        window = limit_config["window_seconds"]
        max_requests = limit_config["requests"]

        self._requests[key] = [t for t in self._requests[key] if t > now - window]

        if len(self._requests[key]) >= max_requests:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={
                    "X-RateLimit-Limit": str(max_requests),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(now + window)),
                },
            )

        self._requests[key].append(now)
        remaining = max_requests - len(self._requests[key])

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(max_requests)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return response
