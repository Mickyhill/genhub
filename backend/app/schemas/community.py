from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class AnnouncementCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=5000)


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    body: str
    created_at: datetime
    department_id: Optional[int] = None
    author_name: Optional[str] = None


class TextBody(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class ForumPostOut(BaseModel):
    id: int
    body: str
    created_at: datetime
    author_name: str
    author_reg_number: Optional[str] = None  # only filled for admins
    mine: bool = False


class SupportMessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    sender_role: str
    body: str
    created_at: datetime


class SupportThreadOut(BaseModel):
    student_id: int
    student_name: str
    reg_number: str
    last_message: str
    last_at: datetime
    awaiting_reply: bool


class SuggestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    body: str
    created_at: datetime
