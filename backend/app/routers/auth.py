from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.reg_number import parse_reg_number
from app.models import Student, Admin, Faculty, Department, Level, Semester, RegNumberRange
from app.schemas.user import StudentRegister, StudentOut, AdminCreate, AdminOut, LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register/student", response_model=StudentOut)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
    reg_number = data.reg_number.strip().upper()

    if db.query(Student).filter(Student.reg_number == reg_number).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This registration number is already registered")

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
            "Your registration number is not within the range approved by your department. "
            "Contact your admin if you believe this is a mistake.",
        )

    # Level and semester must actually belong to the resolved department.
    level = db.query(Level).filter(Level.id == data.level_id, Level.department_id == department.id).first()
    if not level:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Selected level does not belong to your department")

    semester = db.query(Semester).filter(Semester.id == data.semester_id, Semester.level_id == level.id).first()
    if not semester:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Selected semester does not belong to your level")

    student = Student(
        reg_number=reg_number,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        department_id=department.id,
        level_id=level.id,
        semester_id=semester.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/register/admin", response_model=AdminOut)
def register_admin(data: AdminCreate, db: Session = Depends(get_db)):
    # NOTE: In production, lock this endpoint down (e.g. require an existing
    # admin token, or a one-time setup secret) so random users can't self-
    # register as admin. Left open here to keep local setup simple.
    if db.query(Admin).filter(Admin.username == data.username).first():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Username already taken")

    admin = Admin(
        username=data.username,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()

    # Try student (by registration number) first.
    student = db.query(Student).filter(Student.reg_number == identifier.upper()).first()
    if student and verify_password(data.password, student.hashed_password):
        token = create_access_token({"sub": str(student.id), "role": "student"})
        return Token(access_token=token, role="student")

    # Then try admin (by username).
    admin = db.query(Admin).filter(Admin.username == identifier).first()
    if admin and verify_password(data.password, admin.hashed_password):
        token = create_access_token({"sub": str(admin.id), "role": "admin"})
        return Token(access_token=token, role="admin")

    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid registration number/username or password")
