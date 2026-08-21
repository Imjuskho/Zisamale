from __future__ import annotations

from pydantic import BaseModel, model_validator


class UserCreate(BaseModel):
    username: str
    full_name: str
    role: str
    district_id: str | None = None
    facility_id: str | None = None
    chw_id: str | None = None
    phone: str | None = None
    password: str


class UserLogin(BaseModel):
    username: str | None = None
    email: str | None = None
    password: str
    role: str | None = None

    @model_validator(mode="after")
    def require_identity(self) -> UserLogin:
        if not (self.username or self.email):
            raise ValueError("username or email is required")
        return self

    @property
    def identity(self) -> str:
        return (self.username or self.email or "").strip()


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    role: str
    district: str | None = None
    chw_id: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str
    chw_id: str | None = None
    district_id: str | None = None
    user: AuthUser
