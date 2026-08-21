from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_student
from app.models import Student, Level, Semester, Course, TimetableEntry, Material
from app.schemas.academic import CourseOut, TimetableEntryOut, MaterialOut, LevelOut, SemesterOut
from app.schemas.user import StudentOut

router = APIRouter(prefix="/student", tags=["student"], dependencies=[Depends(get_current_student)])

_WEEKDAY_INDEX = {
    "MONDAY": 0, "TUESDAY": 1, "WEDNESDAY": 2, "THURSDAY": 3,
    "FRIDAY": 4, "SATURDAY": 5, "SUNDAY": 6,
}
_ICS_BYDAY = {
    "MONDAY": "MO", "TUESDAY": "TU", "WEDNESDAY": "WE", "THURSDAY": "TH",
    "FRIDAY": "FR", "SATURDAY": "SA", "SUNDAY": "SU",
}


def _get_semester_in_department(db: Session, semester_id: int, department_id: int) -> Semester:
    semester = (
        db.query(Semester)
        .join(Level, Semester.level_id == Level.id)
        .filter(Semester.id == semester_id, Level.department_id == department_id)
        .first()
    )
    if not semester:
        raise HTTPException(403, "This semester is not part of your department")
    return semester


def _next_occurrence(day_name: str) -> date:
    """Returns the next date (today or later) that falls on the given weekday."""
    target = _WEEKDAY_INDEX.get(day_name.upper(), 0)
    today = date.today()
    days_ahead = (target - today.weekday()) % 7
    return today + timedelta(days=days_ahead)


@router.get("/me", response_model=StudentOut)
def get_my_profile(student: Student = Depends(get_current_student)):
    return student


@router.get("/levels", response_model=list[LevelOut])
def get_my_levels(
    student: Student = Depends(get_current_student), db: Session = Depends(get_db)
):
    if not student.department_id:
        raise HTTPException(400, "Your account is not linked to a department")
    return db.query(Level).filter(Level.department_id == student.department_id).all()


@router.get("/semesters", response_model=list[SemesterOut])
def get_semesters_for_level(
    level_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    level = db.query(Level).filter(Level.id == level_id, Level.department_id == student.department_id).first()
    if not level:
        raise HTTPException(403, "This level is not part of your department")
    return db.query(Semester).filter(Semester.level_id == level_id).all()


@router.get("/courses", response_model=list[CourseOut])
def get_courses_for_semester(
    semester_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    semester = _get_semester_in_department(db, semester_id, student.department_id)
    return db.query(Course).filter(Course.semester_id == semester.id).all()


@router.get("/timetable", response_model=list[TimetableEntryOut])
def get_timetable_for_semester(
    semester_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    semester = _get_semester_in_department(db, semester_id, student.department_id)
    entries = db.query(TimetableEntry).filter(TimetableEntry.semester_id == semester.id).all()
    return [
        TimetableEntryOut(
            id=e.id, course_id=e.course_id, course_code=e.course.code, course_title=e.course.title,
            day_of_week=e.day_of_week, start_time=e.start_time, end_time=e.end_time, venue=e.venue,
        )
        for e in entries
    ]


@router.get("/timetable.ics")
def download_timetable_ics(
    semester_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    """
    Generates a calendar file the student imports ONCE into Google/Apple
    Calendar. Their phone's own calendar app then handles reminders and
    alarms natively — more reliable than a custom notification system.
    """
    semester = _get_semester_in_department(db, semester_id, student.department_id)
    entries = db.query(TimetableEntry).filter(TimetableEntry.semester_id == semester.id).all()

    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GenHub//Timetable//EN"]
    for e in entries:
        start_date = _next_occurrence(e.day_of_week)
        dtstart = f"{start_date.strftime('%Y%m%d')}T{e.start_time.strftime('%H%M%S')}"
        dtend = f"{start_date.strftime('%Y%m%d')}T{e.end_time.strftime('%H%M%S')}"
        byday = _ICS_BYDAY.get(e.day_of_week.upper(), "MO")
        summary = f"{e.course.code} Lecture"
        location = e.venue or ""
        lines += [
            "BEGIN:VEVENT",
            f"UID:genhub-{e.id}@genhub",
            f"DTSTART:{dtstart}",
            f"DTEND:{dtend}",
            f"RRULE:FREQ=WEEKLY;BYDAY={byday}",
            f"SUMMARY:{summary}",
            f"LOCATION:{location}",
            "BEGIN:VALARM",
            "TRIGGER:-PT15M",
            "ACTION:DISPLAY",
            "DESCRIPTION:Reminder",
            "END:VALARM",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)

    return Response(
        content=ics_content,
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=timetable.ics"},
    )


@router.get("/courses/{course_id}/materials", response_model=list[MaterialOut])
def get_course_materials(
    course_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(404, "Course not found")
    _get_semester_in_department(db, course.semester_id, student.department_id)
    return db.query(Material).filter(Material.course_id == course_id).all()


@router.get("/materials/{material_id}/download")
def download_material(
    material_id: int,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise HTTPException(404, "Material not found")
    _get_semester_in_department(db, material.course.semester_id, student.department_id)

    return Response(
        content=material.file_data,
        media_type=material.content_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{material.original_filename}"'},
    )
