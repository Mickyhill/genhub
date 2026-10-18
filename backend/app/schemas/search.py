from datetime import datetime
from pydantic import BaseModel


class SearchCourse(BaseModel):
    id: int
    code: str
    title: str
    level_name: str
    semester_name: str


class SearchMaterial(BaseModel):
    id: int
    title: str
    filename: str
    course_id: int
    course_code: str


class SearchPost(BaseModel):
    id: int
    body: str
    author_name: str
    created_at: datetime


class SearchNotice(BaseModel):
    id: int
    title: str
    body: str
    created_at: datetime


class SearchOut(BaseModel):
    query: str
    courses: list[SearchCourse]
    materials: list[SearchMaterial]
    posts: list[SearchPost]
    notices: list[SearchNotice]
