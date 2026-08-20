from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    # 8 is the floor worth enforcing; bcrypt only reads the first 72 bytes anyway
    password: str = Field(min_length=8, max_length=200)
    preferred_language: str = Field(default="en", pattern="^(en|ta|si)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    preferred_language: str
    created_at: Optional[datetime]
    last_login_at: Optional[datetime]

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    preferred_language: Optional[str] = Field(default=None, pattern="^(en|ta|si)$")


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=8, max_length=200)
