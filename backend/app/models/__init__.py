from app.models.academic import Faculty, Department, Level, Semester, Course
from app.models.user import Student, Admin, UserRole
from app.models.academic_extra import TimetableEntry, Material, RegNumberRange

__all__ = [
    "Faculty", "Department", "Level", "Semester", "Course",
    "Student", "Admin", "UserRole",
    "TimetableEntry", "Material", "RegNumberRange",
]
