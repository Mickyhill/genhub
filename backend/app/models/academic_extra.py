"""
Stage 2 (Timetable), Stage 3 (Materials), and Registration Number Ranges.

RegNumberRange lets an admin restrict which student numbers are allowed to
register into a department, e.g. start=1, end=90 means only reg numbers
like .../001 through .../090 can register. A department can have more
than one range (e.g. a normal 1-90 range plus a special extra addition
like 200-205 added later by the admin).
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Time
from sqlalchemy.orm import relationship
from app.core.database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)  # denormalized for fast lookup

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

    title = Column(String, nullable=False)          # display name, e.g. "Lecture 3 Slides"
    original_filename = Column(String, nullable=False)
    stored_filename = Column(String, nullable=False)  # actual name on disk (uuid-based, avoids collisions)
    content_type = Column(String, nullable=True)
    file_size_bytes = Column(Integer, nullable=True)

    course = relationship("Course", back_populates="materials")


class RegNumberRange(Base):
    __tablename__ = "reg_number_ranges"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    start_number = Column(Integer, nullable=False)
    end_number = Column(Integer, nullable=False)
    label = Column(String, nullable=True)  # e.g. "Regular intake" or "Late registration addition"

    department = relationship("Department", back_populates="reg_ranges")
