import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_student
from app.core.config import UPLOAD_DIR
from app.models import Student, Level, Semester, Course, TimetableEntry, Material
from app.schemas.academic import CourseOut, TimetableEntryOut, MaterialOut, LevelOut, SemesterOut
from app.schemas.user import StudentOut

router = APIRouter(prefix="/student", tags=["student"], dependencies=[Depends(get_current_student)])


def _get_semester_in_department(db: Session, semester_id: int, department_id: int) -> Semester:
    """Fetch a semester only if it belongs (via its level) to the given department."""
    semester = (
        db.query(Semester)
        .join(Level, Semester.level_id == Level.id)
        .filter(Semester.id == semester_id, Level.department_id == department_id)
        .first()
    )
    if not semester:
        raise HTTPException(403, "This semester is not part of your department")
    return semester


@router.get("/me", response_model=StudentOut)
def get_my_profile(student: Student = Depends(get_current_student)):
    return student


@router.get("/levels", response_model=list[LevelOut])
def get_my_levels(
    student: Student = Depends(get_current_student), db: Session = Depends(get_db)
):
    """All levels within the student's own department — they can browse any of these freely."""
    if not student.department_id:
        raise HTTPException(400, "Your account is not linked to a department")
    return db.query(Level).filter(Level.department_id == student.department_id).all()


@router.get("/semesters", response_model=list[SemesterOut])
def get_semesters_for_level(
    level_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    level = db.query(Level).filter(Level.id == level_id, Level.department_id == student.department_id).first()
    if not level:
        raise HTTPException(403, "This level is not part of your department")
    return db.query(Semester).filter(Semester.level_id == level_id).all()


@router.get("/courses", response_model=list[CourseOut])
def get_courses_for_semester(
    semester_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    semester = _get_semester_in_department(db, semester_id, student.department_id)
    return db.query(Course).filter(Course.semester_id == semester.id).all()


@router.get("/timetable", response_model=list[TimetableEntryOut])
def get_timetable_for_semester(
    semester_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    semester = _get_semester_in_department(db, semester_id, student.department_id)
    entries = db.query(TimetableEntry).filter(TimetableEntry.semester_id == semester.id).all()
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
    # Confirm this course's semester's level belongs to the student's own department.
    _get_semester_in_department(db, course.semester_id, student.department_id)
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
    _get_semester_in_department(db, material.course.semester_id, student.department_id)

    file_path = os.path.join(UPLOAD_DIR, material.stored_filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File missing on server")

    return FileResponse(file_path, filename=material.original_filename, media_type=material.content_type)
