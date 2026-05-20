from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime
    generation_count: int

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


def doc_to_user(doc: dict) -> UserResponse:
    """Convert a raw MongoDB user document to a UserResponse."""
    d = dict(doc)
    d["id"] = str(d.pop("_id", d.get("id", "")))
    return UserResponse(**d)
