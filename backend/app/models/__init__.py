from app.models.academic import Faculty, Department, Level, Semester, Course
from app.models.user import Student, Admin, Lecturer, UserRole
from app.models.academic_extra import TimetableEntry, Material, RegNumberRange, LecturerCourse, Result
from app.models.community import Announcement, ForumPost, SupportMessage, Suggestion

__all__ = [
    "Faculty", "Department", "Level", "Semester", "Course",
    "Student", "Admin", "Lecturer", "UserRole",
    "TimetableEntry", "Material", "RegNumberRange", "LecturerCourse", "Result",
    "Announcement", "ForumPost", "SupportMessage", "Suggestion",
]
