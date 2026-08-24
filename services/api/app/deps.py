from __future__ import annotations

import os

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, with_loader_criteria

from app.auth import decode_token
from app.database import get_db

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


# ── Catchment scope guard ──────────────────────────────────────────
#
# The seam between authentication and data access. A session carrying
# ``scope_chw_id`` transparently filters every ORM query against chw-scoped
# models, so tenancy stops being a per-handler responsibility.


def _scoped_models() -> tuple[type, ...]:
    # Imported lazily to avoid import cycles at module load.
    from app.models.household import Household
    from app.models.visit import Visit

    return (Visit, Household)


@event.listens_for(Session, "do_orm_execute")
def _apply_chw_scope(execute_state):
    scope = execute_state.session.info.get("scope_chw_id")
    if not scope or execute_state.is_column_load or execute_state.is_relationship_load:
        return
    options = [
        with_loader_criteria(model, lambda cls, s=scope: cls.chw_id == s, include_aliases=True)
        for model in _scoped_models()
    ]
    execute_state.statement = execute_state.statement.options(*options)


def scoped_db(*roles: str):
    """Dependency factory: role check + automatic catchment scoping.

    CHWs get a session whose queries are restricted to their own rows.
    Supervisors and other roles see unfiltered data.
    """

    async def dependency(
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(require_role(*roles)),
    ) -> AsyncSession:
        if user.get("role") == "chw":
            identity = user.get("chw_id") or user.get("sub")
            if identity:
                db.sync_session.info["scope_chw_id"] = str(identity)
        return db

    return dependency
