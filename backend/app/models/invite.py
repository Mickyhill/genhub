"""Single-use lecturer access codes, handed over in person by an admin or class rep."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class LecturerInvite(Base):
    __tablename__ = "lecturer_invites"
    id = Column(Integer, primary_key=True, index=True)
    code_hash = Column(String, unique=True, nullable=False, index=True)
    label = Column(String, nullable=False)  # who the code is for, e.g. "Dr Bello"
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)  # set when a class rep made it
    created_by_student_id = Column(Integer, ForeignKey("students.id"), nullable=True)
    created_by_label = Column(String, nullable=False, default="Admin")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    revoked = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime, nullable=True)
    used_by_lecturer_id = Column(Integer, ForeignKey("lecturers.id"), nullable=True)

    courses = relationship("LecturerInviteCourse", cascade="all, delete-orphan")


class LecturerInviteCourse(Base):
    __tablename__ = "lecturer_invite_courses"
    id = Column(Integer, primary_key=True)
    invite_id = Column(Integer, ForeignKey("lecturer_invites.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    course = relationship("Course")
