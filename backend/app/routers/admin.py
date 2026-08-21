from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin
from app.core.security import hash_password
from app.models import Faculty, Department, Level, Semester, Course, TimetableEntry, Material, RegNumberRange, Student
from app.schemas.academic import (
    FacultyCreate, FacultyOut,
    DepartmentCreate, DepartmentOut,
    LevelCreate, LevelOut,
    SemesterCreate, SemesterOut,
    CourseCreate, CourseOut,
    TimetableEntryCreate, TimetableEntryOut,
    MaterialOut,
    RegNumberRangeCreate, RegNumberRangeOut,
)
from app.schemas.user import StudentOut, PasswordResetRequest

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


# ── Faculty ───────────────────────────────────────────────────────────
@router.post("/faculties", response_model=FacultyOut)
def create_faculty(data: FacultyCreate, db: Session = Depends(get_db)):
    code = data.code.strip().upper()
    if db.query(Faculty).filter(Faculty.name == data.name).first():
        raise HTTPException(400, "Faculty already exists")
    if db.query(Faculty).filter(Faculty.code == code).first():
        raise HTTPException(400, f"Faculty code '{code}' is already in use")
    obj = Faculty(name=data.name, code=code)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/faculties/{faculty_id}", response_model=FacultyOut)
def update_faculty(faculty_id: int, data: FacultyCreate, db: Session = Depends(get_db)):
    obj = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not obj:
        raise HTTPException(404, "Faculty not found")
    obj.name = data.name
    obj.code = data.code.strip().upper()
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/faculties/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db)):
    obj = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not obj:
        raise HTTPException(404, "Faculty not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Department ────────────────────────────────────────────────────────
@router.post("/departments", response_model=DepartmentOut)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db)):
    if not db.query(Faculty).filter(Faculty.id == data.faculty_id).first():
        raise HTTPException(404, "Faculty not found")
    code = data.code.strip().upper()
    if db.query(Department).filter(Department.code == code, Department.faculty_id == data.faculty_id).first():
        raise HTTPException(400, f"Department code '{code}' is already in use in this faculty")
    obj = Department(name=data.name, code=code, faculty_id=data.faculty_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/departments/{department_id}", response_model=DepartmentOut)
def update_department(department_id: int, data: DepartmentCreate, db: Session = Depends(get_db)):
    obj = db.query(Department).filter(Department.id == department_id).first()
    if not obj:
        raise HTTPException(404, "Department not found")
    obj.name = data.name
    obj.code = data.code.strip().upper()
    obj.faculty_id = data.faculty_id
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/departments/{department_id}")
def delete_department(department_id: int, db: Session = Depends(get_db)):
    obj = db.query(Department).filter(Department.id == department_id).first()
    if not obj:
        raise HTTPException(404, "Department not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Level ─────────────────────────────────────────────────────────────
@router.post("/levels", response_model=LevelOut)
def create_level(data: LevelCreate, db: Session = Depends(get_db)):
    if not db.query(Department).filter(Department.id == data.department_id).first():
        raise HTTPException(404, "Department not found")
    obj = Level(name=data.name, department_id=data.department_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/levels/{level_id}", response_model=LevelOut)
def update_level(level_id: int, data: LevelCreate, db: Session = Depends(get_db)):
    obj = db.query(Level).filter(Level.id == level_id).first()
    if not obj:
        raise HTTPException(404, "Level not found")
    obj.name = data.name
    obj.department_id = data.department_id
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/levels/{level_id}")
def delete_level(level_id: int, db: Session = Depends(get_db)):
    obj = db.query(Level).filter(Level.id == level_id).first()
    if not obj:
        raise HTTPException(404, "Level not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Semester ──────────────────────────────────────────────────────────
@router.post("/semesters", response_model=SemesterOut)
def create_semester(data: SemesterCreate, db: Session = Depends(get_db)):
    if not db.query(Level).filter(Level.id == data.level_id).first():
        raise HTTPException(404, "Level not found")
    obj = Semester(name=data.name, level_id=data.level_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/semesters/{semester_id}", response_model=SemesterOut)
def update_semester(semester_id: int, data: SemesterCreate, db: Session = Depends(get_db)):
    obj = db.query(Semester).filter(Semester.id == semester_id).first()
    if not obj:
        raise HTTPException(404, "Semester not found")
    obj.name = data.name
    obj.level_id = data.level_id
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/semesters/{semester_id}")
def delete_semester(semester_id: int, db: Session = Depends(get_db)):
    obj = db.query(Semester).filter(Semester.id == semester_id).first()
    if not obj:
        raise HTTPException(404, "Semester not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Course ────────────────────────────────────────────────────────────
@router.post("/courses", response_model=CourseOut)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    if not db.query(Semester).filter(Semester.id == data.semester_id).first():
        raise HTTPException(404, "Semester not found")
    obj = Course(code=data.code, title=data.title, semester_id=data.semester_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/courses/{course_id}", response_model=CourseOut)
def update_course(course_id: int, data: CourseCreate, db: Session = Depends(get_db)):
    obj = db.query(Course).filter(Course.id == course_id).first()
    if not obj:
        raise HTTPException(404, "Course not found")
    obj.code = data.code
    obj.title = data.title
    obj.semester_id = data.semester_id
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/courses/{course_id}")
def delete_course(course_id: int, db: Session = Depends(get_db)):
    obj = db.query(Course).filter(Course.id == course_id).first()
    if not obj:
        raise HTTPException(404, "Course not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Timetable ─────────────────────────────────────────────────────────
@router.get("/timetable", response_model=list[TimetableEntryOut])
def list_timetable_for_semester(semester_id: int, db: Session = Depends(get_db)):
    entries = db.query(TimetableEntry).filter(TimetableEntry.semester_id == semester_id).all()
    return [
        TimetableEntryOut(
            id=e.id, course_id=e.course_id, course_code=e.course.code, course_title=e.course.title,
            day_of_week=e.day_of_week, start_time=e.start_time, end_time=e.end_time, venue=e.venue,
        )
        for e in entries
    ]


@router.post("/timetable", response_model=TimetableEntryOut)
def create_timetable_entry(data: TimetableEntryCreate, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    obj = TimetableEntry(
        course_id=data.course_id,
        semester_id=data.semester_id,
        day_of_week=data.day_of_week,
        start_time=data.start_time,
        end_time=data.end_time,
        venue=data.venue,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return TimetableEntryOut(
        id=obj.id, course_id=obj.course_id, course_code=course.code, course_title=course.title,
        day_of_week=obj.day_of_week, start_time=obj.start_time, end_time=obj.end_time, venue=obj.venue,
    )


@router.put("/timetable/{entry_id}", response_model=TimetableEntryOut)
def update_timetable_entry(entry_id: int, data: TimetableEntryCreate, db: Session = Depends(get_db)):
    obj = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not obj:
        raise HTTPException(404, "Entry not found")
    course = db.query(Course).filter(Course.id == data.course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    obj.course_id = data.course_id
    obj.semester_id = data.semester_id
    obj.day_of_week = data.day_of_week
    obj.start_time = data.start_time
    obj.end_time = data.end_time
    obj.venue = data.venue
    db.commit()
    db.refresh(obj)
    return TimetableEntryOut(
        id=obj.id, course_id=obj.course_id, course_code=course.code, course_title=course.title,
        day_of_week=obj.day_of_week, start_time=obj.start_time, end_time=obj.end_time, venue=obj.venue,
    )


@router.delete("/timetable/{entry_id}")
def delete_timetable_entry(entry_id: int, db: Session = Depends(get_db)):
    obj = db.query(TimetableEntry).filter(TimetableEntry.id == entry_id).first()
    if not obj:
        raise HTTPException(404, "Entry not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Materials (any file type — stored directly in the database) ──────
@router.post("/materials", response_model=MaterialOut)
def upload_material(
    course_id: int = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")

    file_bytes = file.file.read()

    obj = Material(
        course_id=course_id,
        title=title,
        original_filename=file.filename,
        content_type=file.content_type,
        file_size_bytes=len(file_bytes),
        file_data=file_bytes,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def list_materials_for_course(course_id: int, db: Session = Depends(get_db)):
    return db.query(Material).filter(Material.course_id == course_id).all()


@router.delete("/materials/{material_id}")
def delete_material(material_id: int, db: Session = Depends(get_db)):
    obj = db.query(Material).filter(Material.id == material_id).first()
    if not obj:
        raise HTTPException(404, "Material not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Registration Number Ranges ───────────────────────────────────────
@router.get("/reg-ranges", response_model=list[RegNumberRangeOut])
def list_reg_ranges(department_id: int, db: Session = Depends(get_db)):
    return db.query(RegNumberRange).filter(RegNumberRange.department_id == department_id).all()


@router.post("/reg-ranges", response_model=RegNumberRangeOut)
def create_reg_range(data: RegNumberRangeCreate, db: Session = Depends(get_db)):
    if not db.query(Department).filter(Department.id == data.department_id).first():
        raise HTTPException(404, "Department not found")
    if data.start_number > data.end_number:
        raise HTTPException(400, "Start number must be less than or equal to end number")
    obj = RegNumberRange(
        department_id=data.department_id,
        start_number=data.start_number,
        end_number=data.end_number,
        label=data.label,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/reg-ranges/{range_id}")
def delete_reg_range(range_id: int, db: Session = Depends(get_db)):
    obj = db.query(RegNumberRange).filter(RegNumberRange.id == range_id).first()
    if not obj:
        raise HTTPException(404, "Range not found")
    db.delete(obj)
    db.commit()
    return {"deleted": True}


# ── Student lookup & password reset ──────────────────────────────────
@router.get("/students/lookup", response_model=StudentOut)
def lookup_student(reg_number: str, db: Session = Depends(get_db)):
    """Find a student by registration number — used before resetting a password."""
    student = db.query(Student).filter(Student.reg_number == reg_number.strip().upper()).first()
    if not student:
        raise HTTPException(404, "No student found with that registration number")
    return student


@router.post("/students/reset-password")
def reset_student_password(data: PasswordResetRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.reg_number == data.reg_number.strip().upper()).first()
    if not student:
        raise HTTPException(404, "No student found with that registration number")
    student.hashed_password = hash_password(data.new_password)
    db.commit()
    return {"success": True}
