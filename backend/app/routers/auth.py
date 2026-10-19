import time
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.core.reg_number import parse_reg_number
from app.core.roster import roster_name
from datetime import datetime
from app.models import Student, Admin, Lecturer, Faculty, Department, RegNumberRange, LecturerCourse, LecturerInvite
from app.schemas.user import StudentRegister, StudentOut, AdminCreate, AdminOut, LoginRequest, Token, LecturerSignup

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



MAX_PENDING_PER_DEPARTMENT = 100


@router.post("/register/student", response_model=StudentOut)
def register_student(data: StudentRegister, db: Session = Depends(get_db)):
    """On the department's list: in at once, name from the list.
    Not on the list: the account waits until a class rep or the admin approves it."""
    reg_number = data.reg_number.strip().upper()

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

    if len(data.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password needs at least 6 characters")

    existing = db.query(Student).filter(Student.reg_number == reg_number).first()
    if existing and existing.status == "active":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "This registration number is already registered")
    if existing and existing.status == "pending":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You already asked to join. Wait for your class rep to approve you.")

    on_list, listed_name = roster_name(db, department.id, reg_number)
    if listed_name:
        full_name, new_status = listed_name, "active"
    else:
        full_name = " ".join((data.full_name or "").split())
        if not full_name:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter your full name")
        if len(full_name) > 120:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "That name is too long")
        new_status = "pending"
        waiting = db.query(Student).filter(Student.department_id == department.id, Student.status == "pending").count()
        if waiting >= MAX_PENDING_PER_DEPARTMENT:
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS,
                                "Too many students are waiting in this department. Tell your class rep to clear the requests.")

    if existing:  # a rejected student asking again
        existing.full_name = full_name
        existing.hashed_password = hash_password(data.password)
        existing.status = new_status
        student = existing
    else:
        student = Student(
            reg_number=reg_number, full_name=full_name,
            hashed_password=hash_password(data.password),
            department_id=department.id, status=new_status,
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
        if (student.status or "active") == "pending":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your class rep has not approved you yet. Ask them to open Class rep tools and approve your request.")
        if student.status == "rejected":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your request was not approved. Register again, or speak to your class rep.")
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


@router.post("/register/lecturer", response_model=Token)
def register_lecturer(data: LecturerSignup, request: Request, db: Session = Depends(get_db)):
    """A lecturer signs up with a single-use code that an admin or class rep gave them in person."""
    from app.routers.invites import hash_code
    key = _client_key(request, "LECTURER-CODE")
    _check_locked(key)

    inv = db.query(LecturerInvite).filter(LecturerInvite.code_hash == hash_code(data.code)).first()
    if (not inv or inv.revoked or inv.used_at or inv.expires_at < datetime.utcnow()):
        _record_fail(key)
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This access code is not valid. Ask your class rep or the admin for a new one.")

    username = data.username.strip()
    if len(username) < 3:
        raise HTTPException(400, "Username needs at least 3 characters")
    if len(data.password) < 8:
        raise HTTPException(400, "Password needs at least 8 characters")
    if not data.full_name.strip():
        raise HTTPException(400, "Enter your full name")
    taken = (
        db.query(Lecturer).filter(Lecturer.username == username).first()
        or db.query(Admin).filter(Admin.username == username).first()
    )
    if taken:
        raise HTTPException(400, "That username is taken. Choose another.")

    lecturer = Lecturer(
        username=username, full_name=data.full_name.strip(),
        hashed_password=hash_password(data.password), must_change_password=False,
    )
    db.add(lecturer); db.flush()
    for ic in inv.courses:
        db.add(LecturerCourse(lecturer_id=lecturer.id, course_id=ic.course_id))
    inv.used_at = datetime.utcnow()
    inv.used_by_lecturer_id = lecturer.id
    db.commit()
    _fails.pop(key, None)
    token = create_access_token({"sub": str(lecturer.id), "role": "lecturer"})
    return Token(access_token=token, role="lecturer")
