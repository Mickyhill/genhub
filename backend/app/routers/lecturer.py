from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_lecturer
from app.models import Lecturer, LecturerCourse, Course, Material, TimetableEntry, Student, Result
from app.schemas.academic import (
    AssignedCourseOut, MaterialOut, TimetableEntryCreate, TimetableEntryOut,
    ResultCreate, ResultOut,
)
from app.schemas.user import LecturerOut, StudentOut

router = APIRouter(prefix="/lecturer", tags=["lecturer"], dependencies=[Depends(get_current_lecturer)])


def _assert_owns_course(db: Session, lecturer_id: int, course_id: int) -> Course:
    row = db.query(LecturerCourse).filter(
        LecturerCourse.lecturer_id == lecturer_id, LecturerCourse.course_id == course_id
    ).first()
    if not row:
        raise HTTPException(403, "You are not assigned to this course")
    return row.course


@router.get("/me", response_model=LecturerOut)
def get_my_profile(lecturer: Lecturer = Depends(get_current_lecturer)):
    return lecturer


@router.get("/courses", response_model=list[AssignedCourseOut])
def get_my_courses(
    lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    rows = db.query(LecturerCourse).filter(LecturerCourse.lecturer_id == lecturer.id).all()
    return [
        AssignedCourseOut(id=r.id, course_id=r.course.id, course_code=r.course.code, course_title=r.course.title)
        for r in rows
    ]


@router.get("/students/lookup", response_model=StudentOut)
def lookup_student(
    reg_number: str, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    """Find a student by reg number so a lecturer can enter their score without needing a raw ID."""
    student = db.query(Student).filter(Student.reg_number == reg_number.strip().upper()).first()
    if not student:
        raise HTTPException(404, "No student found with that registration number")
    return student


# ── Materials (only for assigned courses) ─────────────────────────────
@router.post("/materials", response_model=MaterialOut)
def upload_material(
    course_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    lecturer: Lecturer = Depends(get_current_lecturer),
    db: Session = Depends(get_db),
):
    _assert_owns_course(db, lecturer.id, course_id)
    file_bytes = file.file.read()
    obj = Material(
        course_id=course_id, title=title, original_filename=file.filename,
        content_type=file.content_type, file_size_bytes=len(file_bytes), file_data=file_bytes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def list_materials(
    course_id: int, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    _assert_owns_course(db, lecturer.id, course_id)
    return db.query(Material).filter(Material.course_id == course_id).all()


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: int, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(404, "Material not found")
    _assert_owns_course(db, lecturer.id, material.course_id)
    db.delete(material)
    db.commit()
    return {"deleted": True}


# ── Timetable (only for assigned courses) ─────────────────────────────
@router.post("/timetable", response_model=TimetableEntryOut)
def create_timetable_entry(
    data: TimetableEntryCreate, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    course = _assert_owns_course(db, lecturer.id, data.course_id)
    obj = TimetableEntry(
        course_id=data.course_id, semester_id=data.semester_id, day_of_week=data.day_of_week,
        start_time=data.start_time, end_time=data.end_time, venue=data.venue,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return TimetableEntryOut(
        id=obj.id, course_id=obj.course_id, course_code=course.code, course_title=course.title,
        day_of_week=obj.day_of_week, start_time=obj.start_time, end_time=obj.end_time, venue=obj.venue,
    )


@router.delete("/timetable/{entry_id}")
def delete_timetable_entry(
    entry_id: int, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    entry = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(404, "Entry not found")
    _assert_owns_course(db, lecturer.id, entry.course_id)
    db.delete(entry)
    db.commit()
    return {"deleted": True}


# ── Results (only for assigned courses) ───────────────────────────────
def _compute_grade(total: float) -> str:
    if total >= 70: return "A"
    if total >= 60: return "B"
    if total >= 50: return "C"
    if total >= 45: return "D"
    return "F"


def _result_to_out(r: Result) -> ResultOut:
    ca = r.ca_score or 0
    exam = r.exam_score or 0
    total = ca + exam
    return ResultOut(
        id=r.id, student_id=r.student_id, student_reg_number=r.student.reg_number, student_name=r.student.full_name,
        course_id=r.course_id, course_code=r.course.code, ca_score=r.ca_score, exam_score=r.exam_score,
        total=total, grade=_compute_grade(total),
    )


@router.get("/results", response_model=list[ResultOut])
def list_results(
    course_id: int, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    _assert_owns_course(db, lecturer.id, course_id)
    rows = db.query(Result).filter(Result.course_id == course_id).all()
    return [_result_to_out(r) for r in rows]


@router.post("/results", response_model=ResultOut)
def upsert_result(
    data: ResultCreate, lecturer: Lecturer = Depends(get_current_lecturer), db: Session = Depends(get_db)
):
    _assert_owns_course(db, lecturer.id, data.course_id)
    if not db.query(Student).filter(Student.id == data.student_id).first():
        raise HTTPException(404, "Student not found")
    row = db.query(Result).filter(Result.student_id == data.student_id, Result.course_id == data.course_id).first()
    if row:
        row.ca_score = data.ca_score
        row.exam_score = data.exam_score
    else:
        row = Result(student_id=data.student_id, course_id=data.course_id, ca_score=data.ca_score, exam_score=data.exam_score)
        db.add(row)
    db.commit()
    db.refresh(row)
    return _result_to_out(row)
