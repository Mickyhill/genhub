from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Student, Admin, Lecturer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_payload(token: str = Depends(oauth2_scheme)) -> dict:
    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    return payload


def get_current_student(
    payload: dict = Depends(get_current_payload), db: Session = Depends(get_db)
) -> Student:
    if payload.get("role") != "student":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Student access required")
    student = db.query(Student).filter(Student.id == payload.get("sub")).first()
    if not student:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Student not found")
    return student


def get_current_admin(
    payload: dict = Depends(get_current_payload), db: Session = Depends(get_db)
) -> Admin:
    if payload.get("role") != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin access required")
    admin = db.query(Admin).filter(Admin.id == payload.get("sub")).first()
    if not admin:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Admin not found")
    return admin


def get_current_lecturer_any(
    payload: dict = Depends(get_current_payload), db: Session = Depends(get_db)
) -> Lecturer:
    """Lecturer, even if they still must change their password."""
    if payload.get("role") != "lecturer":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Lecturer access required")
    lecturer = db.query(Lecturer).filter(Lecturer.id == payload.get("sub")).first()
    if not lecturer:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Lecturer not found")
    if not lecturer.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This account is suspended. Contact the admin.")
    return lecturer


def get_current_lecturer(lecturer: Lecturer = Depends(get_current_lecturer_any)) -> Lecturer:
    if lecturer.must_change_password:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Password change required")
    return lecturer


def get_current_rep(student: Student = Depends(get_current_student)) -> Student:
    """A student the admin has made a class rep. Always limited to their own department."""
    if not student.is_rep or not student.department_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Class rep access required")
    return student
