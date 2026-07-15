from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "user"
    organisation: Optional[str] = None
    avatar_url: Optional[str] = None

class UserRegister(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    approval_status: str
    contribution_score: int
    reports_count: int
    verified_reports: int
    badges: List[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
