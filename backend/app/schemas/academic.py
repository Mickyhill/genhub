from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import time


# ── Faculty ───────────────────────────────────────────────────────────
class FacultyCreate(BaseModel):
    name: str
    code: str


class FacultyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str


# ── Department ────────────────────────────────────────────────────────
class DepartmentCreate(BaseModel):
    name: str
    code: str
    faculty_id: int


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    code: str
    faculty_id: int


# ── Level ─────────────────────────────────────────────────────────────
class LevelCreate(BaseModel):
    name: str
    department_id: int


class LevelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    department_id: int


# ── Semester ──────────────────────────────────────────────────────────
class SemesterCreate(BaseModel):
    name: str
    level_id: int


class SemesterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    level_id: int


# ── Course ────────────────────────────────────────────────────────────
class CourseCreate(BaseModel):
    code: str
    title: str
    semester_id: int


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    code: str
    title: str
    semester_id: int


# ── Timetable ─────────────────────────────────────────────────────────
class TimetableEntryCreate(BaseModel):
    course_id: int
    semester_id: int
    day_of_week: str
    start_time: time
    end_time: time
    venue: Optional[str] = None


class TimetableEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    course_code: Optional[str] = None
    course_title: Optional[str] = None
    day_of_week: str
    start_time: time
    end_time: time
    venue: Optional[str] = None


# ── Materials ─────────────────────────────────────────────────────────
class MaterialOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    course_id: int
    title: str
    original_filename: str
    content_type: Optional[str] = None
    file_size_bytes: Optional[int] = None


# ── Registration Number Ranges ───────────────────────────────────────
class RegNumberRangeCreate(BaseModel):
    department_id: int
    start_number: int
    end_number: int
    label: Optional[str] = None


class RegNumberRangeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_id: int
    start_number: int
    end_number: int
    label: Optional[str] = None


# ── Reg number resolution (public lookup) ────────────────────────────
class ResolvedRegNumber(BaseModel):
    faculty_id: int
    faculty_name: str
    department_id: int
    department_name: str


# ── Lecturer-Course assignment ───────────────────────────────────────
class CourseAssignment(BaseModel):
    course_id: int


class AssignedCourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int  # LecturerCourse row id
    course_id: int
    course_code: str
    course_title: str


# ── Results ───────────────────────────────────────────────────────────
class ResultCreate(BaseModel):
    student_id: int
    course_id: int
    ca_score: Optional[float] = None
    exam_score: Optional[float] = None


class ResultOut(BaseModel):
    id: int
    student_id: int
    student_reg_number: str
    student_name: str
    course_id: int
    course_code: str
    ca_score: Optional[float] = None
    exam_score: Optional[float] = None
    total: float
    grade: str


# ── Admin analytics ───────────────────────────────────────────────────
class AnalyticsOverview(BaseModel):
    total_students: int
    total_faculties: int
    total_departments: int
    total_courses: int
    total_materials: int
    total_lecturers: int
    departments_missing_reg_ranges: list[str]
