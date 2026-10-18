"""Lecturer access codes. A class rep (own department only) or the admin makes a
single-use code for named courses and hands it to the lecturer in person."""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_rep
from app.models import (
    Student, Course, Semester, Level, Department, Lecturer,
    LecturerInvite, LecturerInviteCourse,
)
from app.schemas.invite import (
    InviteCreate, InviteOut, InviteCourseOut, CourseOption, RepOut, RepPromote,
)

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no I, L, O, 0, 1 so a code is easy to read aloud


def normalize(code: str) -> str:
    return "".join(ch for ch in code.upper() if ch.isalnum())


def hash_code(code: str) -> str:
    return hashlib.sha256(normalize(code).encode()).hexdigest()


def new_code() -> str:
    raw = "".join(secrets.choice(ALPHABET) for _ in range(8))
    return f"GH-{raw[:4]}-{raw[4:]}"


def status_of(inv: LecturerInvite) -> str:
    if inv.revoked:
        return "revoked"
    if inv.used_at:
        return "used"
    if inv.expires_at < datetime.utcnow():
        return "expired"
    return "unused"


def to_out(inv: LecturerInvite, db: Session, plain_code: str | None = None) -> InviteOut:
    used_by = None
    if inv.used_by_lecturer_id:
        lec = db.get(Lecturer, inv.used_by_lecturer_id)
        used_by = f"{lec.full_name} ({lec.username})" if lec else None
    return InviteOut(
        id=inv.id, label=inv.label,
        courses=[InviteCourseOut(id=c.course.id, code=c.course.code, title=c.course.title) for c in inv.courses],
        created_at=inv.created_at, expires_at=inv.expires_at, status=status_of(inv),
        created_by=inv.created_by_label, used_by=used_by, code=plain_code,
    )


def course_options(db: Session, department_id: int | None) -> list[CourseOption]:
    q = (
        db.query(Course, Semester, Level, Department)
        .join(Semester, Course.semester_id == Semester.id)
        .join(Level, Semester.level_id == Level.id)
        .join(Department, Level.department_id == Department.id)
    )
    if department_id is not None:
        q = q.filter(Department.id == department_id)
    rows = q.order_by(Department.name, Level.name, Semester.name, Course.code).all()
    return [
        CourseOption(id=c.id, code=c.code, title=c.title, level=l.name, semester=s.name, department=d.name)
        for c, s, l, d in rows
    ]


def make_invite(db: Session, data: InviteCreate, department_id: int | None, created_by_student_id: int | None, created_by_label: str) -> InviteOut:
    allowed = {o.id for o in course_options(db, department_id)}
    ids = set(data.course_ids)
    if not ids <= allowed:
        raise HTTPException(403, "One of these courses is outside your department")
    code = new_code()
    inv = LecturerInvite(
        code_hash=hash_code(code), label=data.label.strip(), department_id=department_id,
        created_by_student_id=created_by_student_id, created_by_label=created_by_label,
        expires_at=datetime.utcnow() + timedelta(days=data.days_valid),
    )
    inv.courses = [LecturerInviteCourse(course_id=cid) for cid in sorted(ids)]
    db.add(inv); db.commit(); db.refresh(inv)
    return to_out(inv, db, plain_code=code)


# ── Class rep side ────────────────────────────────────────────────────
rep_router = APIRouter(prefix="/rep", tags=["rep-invites"])


@rep_router.get("/course-options", response_model=list[CourseOption])
def rep_course_options(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return course_options(db, rep.department_id)


@rep_router.post("/invites", response_model=InviteOut)
def rep_create_invite(data: InviteCreate, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return make_invite(db, data, rep.department_id, rep.id, f"Class rep {rep.full_name}")


@rep_router.get("/invites", response_model=list[InviteOut])
def rep_list_invites(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    rows = (db.query(LecturerInvite).filter(LecturerInvite.department_id == rep.department_id)
            .order_by(LecturerInvite.created_at.desc()).all())
    return [to_out(i, db) for i in rows]


@rep_router.delete("/invites/{invite_id}", status_code=204)
def rep_revoke_invite(invite_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    inv = db.get(LecturerInvite, invite_id)
    if not inv or inv.department_id != rep.department_id:
        raise HTTPException(404, "Code not found")
    if not inv.used_at:
        inv.revoked = True
        db.commit()


# ── Admin side ────────────────────────────────────────────────────────
admin_router = APIRouter(prefix="/admin", tags=["admin-invites"], dependencies=[Depends(get_current_admin)])


@admin_router.get("/invites/course-options", response_model=list[CourseOption])
def admin_course_options(db: Session = Depends(get_db)):
    return course_options(db, None)


@admin_router.post("/invites", response_model=InviteOut)
def admin_create_invite(data: InviteCreate, db: Session = Depends(get_db)):
    return make_invite(db, data, None, None, "Admin")


@admin_router.get("/invites", response_model=list[InviteOut])
def admin_list_invites(db: Session = Depends(get_db)):
    rows = db.query(LecturerInvite).order_by(LecturerInvite.created_at.desc()).all()
    return [to_out(i, db) for i in rows]


@admin_router.delete("/invites/{invite_id}", status_code=204)
def admin_revoke_invite(invite_id: int, db: Session = Depends(get_db)):
    inv = db.get(LecturerInvite, invite_id)
    if not inv:
        raise HTTPException(404, "Code not found")
    if not inv.used_at:
        inv.revoked = True
        db.commit()


@admin_router.get("/reps", response_model=list[RepOut])
def list_reps(db: Session = Depends(get_db)):
    rows = db.query(Student).filter(Student.is_rep.is_(True)).order_by(Student.full_name).all()
    return [RepOut(id=s.id, reg_number=s.reg_number, full_name=s.full_name,
                   department=s.department.name if s.department else None) for s in rows]


@admin_router.post("/reps", response_model=RepOut)
def promote_rep(data: RepPromote, db: Session = Depends(get_db)):
    s = db.query(Student).filter(Student.reg_number == data.reg_number.strip().upper()).first()
    if not s:
        raise HTTPException(404, "No student with that registration number")
    if not s.department_id:
        raise HTTPException(400, "This student has no department")
    s.is_rep = True
    db.commit(); db.refresh(s)
    return RepOut(id=s.id, reg_number=s.reg_number, full_name=s.full_name,
                  department=s.department.name if s.department else None)


@admin_router.delete("/reps/{student_id}", status_code=204)
def demote_rep(student_id: int, db: Session = Depends(get_db)):
    s = db.get(Student, student_id)
    if not s:
        raise HTTPException(404, "Student not found")
    s.is_rep = False
    db.commit()
