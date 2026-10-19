"""A class rep edits levels, semesters, courses, timetable and materials. Only inside their own department.
They cannot touch faculties, departments, number ranges, lecturers' accounts or results."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_rep
from app.models import Student, Department, Level, Semester, Course, TimetableEntry, Material
from app.schemas.academic import (
    LevelOut, SemesterOut, CourseOut, TimetableEntryOut, MaterialOut, DepartmentOut,
)
from pydantic import BaseModel

router = APIRouter(prefix="/rep/manage", tags=["rep-manage"])
DAYS = {"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}
MAX_MATERIAL_BYTES = 15 * 1024 * 1024


class NameIn(BaseModel):
    name: str


class SemesterIn(BaseModel):
    name: str
    level_id: int


class CourseIn(BaseModel):
    code: str
    title: str
    semester_id: int


class TimetableIn(BaseModel):
    course_id: int
    semester_id: int
    day_of_week: str
    start_time: str
    end_time: str
    venue: str | None = None


# ── ownership checks: every id must lead back to the rep's department ──
def _level(db, rep, level_id) -> Level:
    o = db.get(Level, level_id)
    if not o or o.department_id != rep.department_id:
        raise HTTPException(404, "Not found in your department")
    return o


def _semester(db, rep, semester_id) -> Semester:
    o = db.get(Semester, semester_id)
    if not o or o.level.department_id != rep.department_id:
        raise HTTPException(404, "Not found in your department")
    return o


def _course(db, rep, course_id) -> Course:
    o = db.get(Course, course_id)
    if not o or o.semester.level.department_id != rep.department_id:
        raise HTTPException(404, "Not found in your department")
    return o


def _text(value: str, what: str, limit=200) -> str:
    v = " ".join((value or "").split())
    if not v:
        raise HTTPException(400, f"{what} cannot be empty")
    if len(v) > limit:
        raise HTTPException(400, f"{what} is too long")
    return v


def _tt_out(e: TimetableEntry) -> TimetableEntryOut:
    return TimetableEntryOut(id=e.id, course_id=e.course_id, course_code=e.course.code, course_title=e.course.title,
                             day_of_week=e.day_of_week, start_time=e.start_time, end_time=e.end_time, venue=e.venue)


@router.get("/department", response_model=DepartmentOut)
def my_department(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return db.get(Department, rep.department_id)


# ── Levels ───────────────────────────────────────────────────────────
@router.get("/levels", response_model=list[LevelOut])
def levels(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return db.query(Level).filter(Level.department_id == rep.department_id).order_by(Level.name).all()


@router.post("/levels", response_model=LevelOut)
def add_level(data: NameIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    name = _text(data.name, "Level", 40)
    if db.query(Level).filter(Level.department_id == rep.department_id, Level.name == name).first():
        raise HTTPException(400, "This level already exists")
    o = Level(name=name, department_id=rep.department_id)
    db.add(o); db.commit(); db.refresh(o)
    return o


@router.put("/levels/{level_id}", response_model=LevelOut)
def edit_level(level_id: int, data: NameIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    o = _level(db, rep, level_id)
    o.name = _text(data.name, "Level", 40)
    db.commit(); db.refresh(o)
    return o


@router.delete("/levels/{level_id}", status_code=204)
def delete_level(level_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    db.delete(_level(db, rep, level_id)); db.commit()


# ── Semesters ────────────────────────────────────────────────────────
@router.get("/semesters", response_model=list[SemesterOut])
def semesters(level_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _level(db, rep, level_id)
    return db.query(Semester).filter(Semester.level_id == level_id).order_by(Semester.name).all()


@router.post("/semesters", response_model=SemesterOut)
def add_semester(data: SemesterIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _level(db, rep, data.level_id)
    name = _text(data.name, "Semester", 40)
    if db.query(Semester).filter(Semester.level_id == data.level_id, Semester.name == name).first():
        raise HTTPException(400, "This semester already exists")
    o = Semester(name=name, level_id=data.level_id)
    db.add(o); db.commit(); db.refresh(o)
    return o


@router.put("/semesters/{semester_id}", response_model=SemesterOut)
def edit_semester(semester_id: int, data: NameIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    o = _semester(db, rep, semester_id)
    o.name = _text(data.name, "Semester", 40)
    db.commit(); db.refresh(o)
    return o


@router.delete("/semesters/{semester_id}", status_code=204)
def delete_semester(semester_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    db.delete(_semester(db, rep, semester_id)); db.commit()


# ── Courses ──────────────────────────────────────────────────────────
@router.get("/courses", response_model=list[CourseOut])
def courses(semester_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _semester(db, rep, semester_id)
    return db.query(Course).filter(Course.semester_id == semester_id).order_by(Course.code).all()


@router.post("/courses", response_model=CourseOut)
def add_course(data: CourseIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _semester(db, rep, data.semester_id)
    code = _text(data.code, "Course code", 30)
    if db.query(Course).filter(Course.semester_id == data.semester_id, Course.code == code).first():
        raise HTTPException(400, "This course code already exists in this semester")
    o = Course(code=code, title=_text(data.title, "Course title"), semester_id=data.semester_id)
    db.add(o); db.commit(); db.refresh(o)
    return o


@router.put("/courses/{course_id}", response_model=CourseOut)
def edit_course(course_id: int, data: CourseIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    o = _course(db, rep, course_id)
    o.code = _text(data.code, "Course code", 30)
    o.title = _text(data.title, "Course title")
    db.commit(); db.refresh(o)
    return o


@router.delete("/courses/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    db.delete(_course(db, rep, course_id)); db.commit()


# ── Timetable ────────────────────────────────────────────────────────
@router.get("/timetable", response_model=list[TimetableEntryOut])
def timetable(semester_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _semester(db, rep, semester_id)
    rows = db.query(TimetableEntry).filter(TimetableEntry.semester_id == semester_id).all()
    return [_tt_out(e) for e in rows]


@router.post("/timetable", response_model=TimetableEntryOut)
def add_timetable(data: TimetableIn, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    from datetime import time as dtime
    sem = _semester(db, rep, data.semester_id)
    course = _course(db, rep, data.course_id)
    if course.semester_id != sem.id:
        raise HTTPException(400, "This course is not in the selected semester")
    if data.day_of_week not in DAYS:
        raise HTTPException(400, "Pick a day from Monday to Sunday")
    try:
        st, en = dtime.fromisoformat(data.start_time), dtime.fromisoformat(data.end_time)
    except ValueError:
        raise HTTPException(400, "Times must look like 08:00")
    if en <= st:
        raise HTTPException(400, "End time must be after the start time")
    o = TimetableEntry(course_id=course.id, semester_id=sem.id, day_of_week=data.day_of_week,
                       start_time=st, end_time=en, venue=(data.venue or "").strip()[:100] or None)
    db.add(o); db.commit(); db.refresh(o)
    return _tt_out(o)


@router.delete("/timetable/{entry_id}", status_code=204)
def delete_timetable(entry_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    o = db.get(TimetableEntry, entry_id)
    if not o:
        raise HTTPException(404, "Not found in your department")
    _semester(db, rep, o.semester_id)
    db.delete(o); db.commit()


# ── Materials ────────────────────────────────────────────────────────
@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def materials(course_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _course(db, rep, course_id)
    cols = (Material.id, Material.course_id, Material.title, Material.original_filename, Material.content_type, Material.file_size_bytes)
    rows = db.query(*cols).filter(Material.course_id == course_id).all()
    return [MaterialOut(id=r[0], course_id=r[1], title=r[2], original_filename=r[3], content_type=r[4], file_size_bytes=r[5]) for r in rows]


@router.post("/materials", response_model=MaterialOut)
async def upload_material(course_id: int = Form(...), title: str = Form(...), file: UploadFile = File(...),
                          db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    _course(db, rep, course_id)
    data = await file.read()
    if len(data) > MAX_MATERIAL_BYTES:
        raise HTTPException(400, "File is too big. Keep it under 15 MB.")
    o = Material(course_id=course_id, title=_text(title, "Title"), original_filename=(file.filename or "file")[:200],
                 content_type=file.content_type, file_size_bytes=len(data), file_data=data)
    db.add(o); db.commit(); db.refresh(o)
    return o


@router.delete("/materials/{material_id}", status_code=204)
def delete_material(material_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    o = db.query(Material.id, Material.course_id).filter(Material.id == material_id).first()
    if not o:
        raise HTTPException(404, "Not found in your department")
    _course(db, rep, o[1])
    db.query(Material).filter(Material.id == material_id).delete()
    db.commit()
