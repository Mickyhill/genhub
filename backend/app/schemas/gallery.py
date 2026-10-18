from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class GalleryItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    title: str
    description: Optional[str] = None
    created_at: datetime


class GalleryItemUpdate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    description: Optional[str] = Field(default=None, max_length=1000)
