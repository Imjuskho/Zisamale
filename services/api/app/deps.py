from __future__ import annotations

import os

from fastapi import Depends, HTTPException, Request, status
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
        # "*" admits any authenticated role — CHWs are still pinned at the seam.
        if "*" not in roles and user.get("role") not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.get('role')}' not in required roles: {roles}",
            )
        return user
    return checker


def actor_user_id(user: dict) -> str:
    return str(user.get("sub") or "")


# ── Catchment scope guard ──────────────────────────────────────────
#
# The seam between authentication and data access. A session carrying
# ``scope_chw_id`` transparently filters every ORM query against chw-scoped
# models, so tenancy stops being a per-handler responsibility. A ``chw_id``
# path parameter is validated here too: for CHW tokens it must match the
# identity inside the JWT, or the request is rejected before any query runs.


def _scoped_models() -> tuple[type, ...]:
    # Imported lazily to avoid import cycles at module load.
    from app.models.child import Child
    from app.models.household import Household
    from app.models.pregnancy import Pregnancy
    from app.models.visit import Visit

    return (Visit, Household, Pregnancy, Child)


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

    CHWs get a session whose queries are restricted to their own rows, and a
    ``chw_id`` path parameter (when the route has one) must match their token
    identity — cross-catchment requests are rejected here, not per handler.
    Pass ``*`` to keep the endpoint open to any authenticated role while
    still pinning CHW sessions. Other roles see unfiltered data.
    """

    async def dependency(
        request: Request,
        db: AsyncSession = Depends(get_db),
        user: dict = Depends(require_role(*roles)),
    ) -> AsyncSession:
        if user.get("role") == "chw":
            identity = str(user.get("sub") or user.get("chw_id") or "")
            allowed = {str(v) for v in (user.get("sub"), user.get("chw_id")) if v}
            if not identity or not allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Token carries no catchment identity",
                )
            requested = request.path_params.get("chw_id")
            if requested is not None and str(requested) not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot access another CHW's catchment",
                )
            db.sync_session.info["scope_chw_id"] = identity
        return db

    return dependency
