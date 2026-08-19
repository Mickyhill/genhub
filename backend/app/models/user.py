from sqlalchemy import Column, Integer, String, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
from app.core.database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    student = "student"


class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    # Registration number, e.g. "24/SCIT/SEN/045" — this is the student's login ID.
    reg_number = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)

    # Department is derived from the reg number at registration (not chosen
    # freely). Level/Semester are chosen by the student since those change
    # as they progress through school.
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=True)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=True)

    department = relationship("Department", back_populates="students")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.admin, nullable=False)
