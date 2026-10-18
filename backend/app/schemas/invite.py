from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class InviteCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    course_ids: list[int] = Field(min_length=1)
    days_valid: int = Field(default=7, ge=1, le=30)


class InviteCourseOut(BaseModel):
    id: int
    code: str
    title: str


class InviteOut(BaseModel):
    id: int
    label: str
    courses: list[InviteCourseOut]
    created_at: datetime
    expires_at: datetime
    status: str  # unused | used | expired | revoked
    created_by: str
    used_by: Optional[str] = None
    code: Optional[str] = None  # only filled once, right after creation


class CourseOption(BaseModel):
    id: int
    code: str
    title: str
    level: str
    semester: str
    department: str


class RepOut(BaseModel):
    id: int
    reg_number: str
    full_name: str
    department: Optional[str] = None


class RepPromote(BaseModel):
    reg_number: str


class StudentLookupOut(BaseModel):
    id: int
    reg_number: str
    full_name: str


class StudentPasswordReset(BaseModel):
    reg_number: str
    password: str
