import time
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.reg_number import parse_reg_number
from app.models import Student, Admin, Lecturer, Faculty, Department, RegNumberRange
from app.schemas.user import StudentRegister, StudentOut, AdminCreate, AdminOut, LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Login lockout ─────────────────────────────────────────────────────
# After MAX_FAILS wrong tries from one device for one account, wait LOCK_SECONDS.
# Kept in memory: it resets when the server restarts, which is fine for this purpose.
MAX_FAILS = 5
LOCK_SECONDS = 10 * 60
_fails: dict = {}


def _client_key(request: Request, identifier: str):
    fwd = request.headers.get("x-forwarded-for", "")
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
    return (identifier.upper(), ip)


def _check_locked(key):
    rec = _fails.get(key)
    if not rec:
        return
    count, first = rec
    if time.time() - first > LOCK_SECONDS:
        _fails.pop(key, None)
        return
    if count >= MAX_FAILS:
        mins = max(1, int((LOCK_SECONDS - (time.time() - first)) / 60) + 1)
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, f"Too many wrong tries. Wait {mins} minute(s) and try again.")


def _record_fail(key):
    count, first = _fails.get(key, (0, time.time()))
    if time.time() - first > LOCK_SECONDS:
        count, first = 0, time.time()
    _fails[key] = (count + 1, first)



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

    # Level and semester are NOT set here anymore — the student picks which
    # level/semester to view freely from their dashboard after logging in.
    student = Student(
        reg_number=reg_number,
        full_name=data.full_name,
        hashed_password=hash_password(data.password),
        department_id=department.id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.post("/register/admin", response_model=AdminOut)
def register_admin(
    data: AdminCreate,
    db: Session = Depends(get_db),
    authorization: str = Header(default=None),
):
    # The very first admin can be created freely (so you can set up the
    # system). After that, only a logged-in admin can create more admins.
    if db.query(Admin).count() > 0:
        token = (authorization or "").removeprefix("Bearer ").strip()
        payload = decode_access_token(token) if token else None
        if not payload or payload.get("role") != "admin":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Only an existing admin can create another admin")
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
def login(data: LoginRequest, request: Request, db: Session = Depends(get_db)):
    identifier = data.identifier.strip()
    key = _client_key(request, identifier)
    _check_locked(key)

    student = db.query(Student).filter(Student.reg_number == identifier.upper()).first()
    if student and verify_password(data.password, student.hashed_password):
        _fails.pop(key, None)
        token = create_access_token({"sub": str(student.id), "role": "student"})
        return Token(access_token=token, role="student")

    admin = db.query(Admin).filter(Admin.username == identifier).first()
    if admin and verify_password(data.password, admin.hashed_password):
        _fails.pop(key, None)
        token = create_access_token({"sub": str(admin.id), "role": "admin"})
        return Token(access_token=token, role="admin")

    lecturer = db.query(Lecturer).filter(Lecturer.username == identifier).first()
    if lecturer and verify_password(data.password, lecturer.hashed_password):
        if not lecturer.is_active:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is suspended. Contact the admin.")
        _fails.pop(key, None)
        token = create_access_token({"sub": str(lecturer.id), "role": "lecturer"})
        return Token(access_token=token, role="lecturer", must_change_password=lecturer.must_change_password)

    _record_fail(key)
    raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid registration number/username or password")
