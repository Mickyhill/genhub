"""
Stage 2 (Timetable), Stage 3 (Materials), and Registration Number Ranges.

Materials store their file content directly in the database (LargeBinary)
rather than on local disk. This is deliberate: Render's free tier does not
guarantee local files survive every deploy, but the database does. Trade-
off: not ideal for huge files (large lecture videos), fine for typical
PDFs/slides/docs.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Time, LargeBinary
from sqlalchemy.orm import relationship
from app.core.database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)

    day_of_week = Column(String, nullable=False)  # "Monday" .. "Sunday"
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    venue = Column(String, nullable=True)

    course = relationship("Course", back_populates="timetable_entries")
    semester = relationship("Semester", back_populates="timetable_entries")


class Material(Base):
    __tablename__ = "materials"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    title = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)
    file_data = Column(LargeBinary, nullable=False)  # the actual file content, stored in Postgres

    course = relationship("Course", back_populates="materials")


class RegNumberRange(Base):
    __tablename__ = "reg_number_ranges"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    start_number = Column(Integer, nullable=False)
    end_number = Column(Integer, nullable=False)
    label = Column(String, nullable=True)

    department = relationship("Department", back_populates="reg_ranges")
