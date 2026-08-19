from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models import Student, Admin

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
