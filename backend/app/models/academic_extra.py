"""
Stage 2 (Timetable), Stage 3 (Materials), Registration Number Ranges,
Lecturer-Course assignments, and Results.
"""
from sqlalchemy import Column, Integer, String, ForeignKey, Time, LargeBinary, Float, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class TimetableEntry(Base):
    __tablename__ = "timetable_entries"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)

    day_of_week = Column(String, nullable=False)
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
    file_data = Column(LargeBinary, nullable=False)

    course = relationship("Course", back_populates="materials")


class RegNumberRange(Base):
    __tablename__ = "reg_number_ranges"

    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    start_number = Column(Integer, nullable=False)
    end_number = Column(Integer, nullable=False)
    label = Column(String, nullable=True)

    department = relationship("Department", back_populates="reg_ranges")


class LecturerCourse(Base):
    """Which courses a given lecturer is allowed to manage (materials, timetable, results)."""
    __tablename__ = "lecturer_courses"

    id = Column(Integer, primary_key=True, index=True)
    lecturer_id = Column(Integer, ForeignKey("lecturers.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)

    lecturer = relationship("Lecturer", back_populates="assigned_courses")
    course = relationship("Course")

    __table_args__ = (UniqueConstraint("lecturer_id", "course_id", name="uq_lecturer_course"),)


class Result(Base):
    """A student's score in one course. Grade is computed at read time, not stored."""
    __tablename__ = "results"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=False)
    ca_score = Column(Float, nullable=True)     # continuous assessment (tests, assignments)
    exam_score = Column(Float, nullable=True)

    student = relationship("Student")
    course = relationship("Course")

    __table_args__ = (UniqueConstraint("student_id", "course_id", name="uq_result_per_student_course"),)
