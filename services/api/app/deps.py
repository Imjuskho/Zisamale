from __future__ import annotations

import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth import decode_token

security = HTTPBearer(auto_error=False)

# Retained so existing tests can detect the pytest environment. Authentication
# always verifies a real JWT — this flag must never grant a default role.
TEST_MODE = os.getenv("ENVIRONMENT") == "testing"


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization token",
        )
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return payload


def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role')}' not in required roles: {roles}",
            )
        return user
    return checker


def actor_user_id(user: dict) -> str:
    return str(user.get("sub") or "")


def assert_chw_scope(user: dict, chw_id: str) -> None:
    """CHWs may only read/write their own catchment. Other roles are unrestricted here."""
    if user.get("role") != "chw":
        return
    allowed = {user.get("sub"), user.get("chw_id")}
    allowed.discard(None)
    allowed.discard("")
    if chw_id not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access another CHW's catchment",
        )
