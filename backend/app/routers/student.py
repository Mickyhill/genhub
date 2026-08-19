import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_student
from app.core.config import UPLOAD_DIR
from app.models import Student, Course, TimetableEntry, Material
from app.schemas.academic import CourseOut, TimetableEntryOut, MaterialOut
from app.schemas.user import StudentOut

router = APIRouter(prefix="/student", tags=["student"], dependencies=[Depends(get_current_student)])


@router.get("/me", response_model=StudentOut)
def get_my_profile(student: Student = Depends(get_current_student)):
    return student


@router.get("/courses", response_model=list[CourseOut])
def get_my_courses(
    student: Student = Depends(get_current_student), db: Session = Depends(get_db)
):
    """Courses matching the student's own semester (which implies dept/level)."""
    if not student.semester_id:
        raise HTTPException(400, "You are not enrolled in a semester yet")
    return db.query(Course).filter(Course.semester_id == student.semester_id).all()


@router.get("/timetable", response_model=list[TimetableEntryOut])
def get_my_timetable(
    student: Student = Depends(get_current_student), db: Session = Depends(get_db)
):
    if not student.semester_id:
        raise HTTPException(400, "You are not enrolled in a semester yet")
    entries = (
        db.query(TimetableEntry)
        .filter(TimetableEntry.semester_id == student.semester_id)
        .all()
    )
    return [
        TimetableEntryOut(
            id=e.id, course_id=e.course_id, course_code=e.course.code, course_title=e.course.title,
            day_of_week=e.day_of_week, start_time=e.start_time, end_time=e.end_time, venue=e.venue,
        )
        for e in entries
    ]


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def get_course_materials(
    course_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    # Guard: student can only browse materials for courses in their own semester.
    if course.semester_id != student.semester_id:
        raise HTTPException(403, "This course is not part of your current semester")
    return db.query(Material).filter(Material.course_id == course_id).all()


@router.get("/materials/{material_id}/download")
def download_material(
    material_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(404, "Material not found")
    if material.course.semester_id != student.semester_id:
        raise HTTPException(403, "This material is not part of your current semester")

    file_path = os.path.join(UPLOAD_DIR, material.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File missing on server")

    return FileResponse(file_path, filename=material.original_filename, media_type=material.content_type)
