"""
Academic hierarchy models.

Since scope is a SINGLE university, we skip a `universities` table and
start at Faculty. Faculty and Department each carry a short `code` (e.g.
"SCIT", "SEN") used to build and validate student registration numbers
(format: YY/FACULTYCODE/DEPTCODE/NUMBER).

Hierarchy:
    Faculty -> Department -> Level -> Semester -> Course
"""
from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base


class Faculty(Base):
    __tablename__ = "faculties"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    code = Column(String, nullable=False, unique=True)

    departments = relationship("Department", back_populates="faculty", cascade="all, delete-orphan")


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    code = Column(String, nullable=False)
    faculty_id = Column(Integer, ForeignKey("faculties.id"), nullable=False)

    faculty = relationship("Faculty", back_populates="departments")
    levels = relationship("Level", back_populates="department", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="department")
    reg_ranges = relationship("RegNumberRange", back_populates="department", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("name", "faculty_id", name="uq_department_name_per_faculty"),
        UniqueConstraint("code", "faculty_id", name="uq_department_code_per_faculty"),
    )


class Level(Base):
    __tablename__ = "levels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    department = relationship("Department", back_populates="levels")
    semesters = relationship("Semester", back_populates="level", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("name", "department_id", name="uq_level_per_department"),)


class Semester(Base):
    __tablename__ = "semesters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    level_id = Column(Integer, ForeignKey("levels.id"), nullable=False)

    level = relationship("Level", back_populates="semesters")
    courses = relationship("Course", back_populates="semester", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="semester", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("name", "level_id", name="uq_semester_per_level"),)


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, nullable=False)
    title = Column(String, nullable=False)
    semester_id = Column(Integer, ForeignKey("semesters.id"), nullable=False)

    semester = relationship("Semester", back_populates="courses")
    materials = relationship("Material", back_populates="course", cascade="all, delete-orphan")
    timetable_entries = relationship("TimetableEntry", back_populates="course", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint("code", "semester_id", name="uq_course_code_per_semester"),)
