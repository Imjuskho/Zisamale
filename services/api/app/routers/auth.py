from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, token_claims, verify_password
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User, UserRole
from app.schemas.user import AuthUser, Token, UserCreate, UserLogin

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


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
    result = await db.execute(select(User).where(User.username == body.identity))
    user = result.scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    return _token_for(user)


@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "user_id": user.get("sub"),
        "role": user.get("role"),
        "chw_id": user.get("chw_id") or user.get("sub"),
        "district_id": user.get("district_id"),
    }
