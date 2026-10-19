from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Boolean, text
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    student = "student"
    lecturer = "lecturer"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    reg_number = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)

    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)

    is_rep = Column(Boolean, nullable=False, default=False, server_default=text("false"))
    # "active" can log in. "pending" waits for a class rep or admin. "rejected" was refused and may ask again.
    status = Column(String, nullable=False, default="active", server_default=text("'active'"))
    reject_count = Column(Integer, nullable=False, default=0, server_default=text("0"))

    department = relationship("Department", back_populates="students")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.admin, nullable=False)


class Lecturer(Base):
    __tablename__ = "lecturers"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.lecturer, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default=text("true"))
    must_change_password = Column(Boolean, nullable=False, default=False, server_default=text("false"))

    assigned_courses = relationship("LecturerCourse", back_populates="lecturer", cascade="all, delete-orphan")
