from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.reg_number import parse_reg_number
from app.models import Faculty, Department, Level, Semester, Course, RegNumberRange
from app.schemas.academic import (
    FacultyOut, DepartmentOut, LevelOut, SemesterOut, CourseOut, ResolvedRegNumber,
)

router = APIRouter(prefix="/browse", tags=["browse"])
# No auth dependency here on purpose: a student needs to see parts of the
# hierarchy BEFORE they have an account (e.g. to pick level/semester once
# their reg number resolves a department at registration time).


@router.get("/faculties", response_model=list[FacultyOut])
def list_faculties(db: Session = Depends(get_db)):
    return db.query(Faculty).all()


@router.get("/departments", response_model=list[DepartmentOut])
def list_departments(faculty_id: int, db: Session = Depends(get_db)):
    return db.query(Department).filter(Department.faculty_id == faculty_id).all()


@router.get("/levels", response_model=list[LevelOut])
def list_levels(department_id: int, db: Session = Depends(get_db)):
    return db.query(Level).filter(Level.department_id == department_id).all()


@router.get("/semesters", response_model=list[SemesterOut])
def list_semesters(level_id: int, db: Session = Depends(get_db)):
    return db.query(Semester).filter(Semester.level_id == level_id).all()


@router.get("/courses", response_model=list[CourseOut])
def list_courses(semester_id: int, db: Session = Depends(get_db)):
    return db.query(Course).filter(Course.semester_id == semester_id).all()


@router.get("/resolve-reg-number", response_model=ResolvedRegNumber)
def resolve_reg_number(reg_number: str, db: Session = Depends(get_db)):
    """
    Used during student registration: given a reg number like
    24/SCIT/SEN/045, figures out which faculty/department it belongs to
    and confirms the student number falls within an admin-approved range.
    Does NOT check if the reg number is already registered (auth handles that).
    """
    try:
        _year, faculty_code, dept_code, number = parse_reg_number(reg_number)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e))

    faculty = db.query(Faculty).filter(Faculty.code == faculty_code).first()
    if not faculty:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No faculty found with code '{faculty_code}'")

    department = (
        db.query(Department)
        .filter(Department.code == dept_code, Department.faculty_id == faculty.id)
        .first()
    )
    if not department:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"No department found with code '{dept_code}' in {faculty.name}")

    ranges = db.query(RegNumberRange).filter(RegNumberRange.department_id == department.id).all()
    if not ranges or not any(r.start_number <= number <= r.end_number for r in ranges):
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "This registration number is not within the range approved by the department admin.",
        )

    return ResolvedRegNumber(
        faculty_id=faculty.id, faculty_name=faculty.name,
        department_id=department.id, department_name=department.name,
    )
