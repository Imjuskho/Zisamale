from __future__ import annotations

import time
import uuid
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, token_claims, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import AuthUser, Token, UserCreate, UserLogin

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# ── Brute-force protection ──────────────────────────────────
_LOGIN_FAILURES: dict[str, list[float]] = defaultdict(list)
_MAX_FAILURES = 5
_LOCKOUT_SECONDS = 900  # 15 minutes


def _role_value(user: User) -> str:
    return user.role.value if hasattr(user.role, "value") else str(user.role)


def _token_for(user: User) -> Token:
    role = _role_value(user)
    payload = Token(
        access_token=create_access_token(token_claims(user)),
        role=role,
        user_id=user.user_id,
        chw_id=user.chw_id or user.user_id,
        district_id=user.district_id,
        user=AuthUser(
            id=user.user_id,
            name=user.full_name,
            email=user.username,
            role=role,
            district=user.district_id,
            chw_id=user.chw_id or user.user_id,
        ),
    )
    return payload


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already exists")

    # Only chw and supervisor roles can self-register.
    # dho, phim, mohp must be created by an existing admin.
    allowed_public_roles = {"chw", "supervisor"}
    if body.role not in allowed_public_roles:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{body.role}' cannot be self-registered. "
            "Contact a system administrator to create privileged accounts.",
        )

    try:
        role = UserRole(body.role)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid role: {body.role}") from exc

    user = User(
        user_id=str(uuid.uuid4()),
        username=body.username,
        full_name=body.full_name,
        role=role,
        district_id=body.district_id,
        facility_id=body.facility_id,
        chw_id=body.chw_id,
        phone=body.phone,
        is_active=True,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.flush()
    return _token_for(user)


@router.post("/login", response_model=Token)
async def login(body: UserLogin, db: AsyncSession = Depends(get_db)):
    now = time.time()
    identity = body.identity

    # Check lockout
    failures = _LOGIN_FAILURES[identity]
    # Prune old failures
    _LOGIN_FAILURES[identity] = [t for t in failures if t > now - _LOCKOUT_SECONDS]
    if len(_LOGIN_FAILURES[identity]) >= _MAX_FAILURES:
        raise HTTPException(
            status_code=429,
            detail=f"Too many failed attempts. Try again in {_LOCKOUT_SECONDS // 60} minutes.",
        )

    result = await db.execute(select(User).where(User.username == identity))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        _LOGIN_FAILURES[identity].append(now)
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    # Clear failures on success
    _LOGIN_FAILURES.pop(identity, None)
    return _token_for(user)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "role": user.get("role"),
        "chw_id": user.get("chw_id") or user.get("sub"),
        "district_id": user.get("district_id"),
    }
