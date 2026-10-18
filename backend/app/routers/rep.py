"""What a class rep may do, always inside their own department."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_rep
from app.core.security import hash_password
from app.models import Student, Announcement, ForumPost
from app.schemas.community import AnnouncementCreate, AnnouncementOut, ForumPostOut
from app.schemas.invite import StudentLookupOut, StudentPasswordReset

router = APIRouter(prefix="/rep", tags=["rep"])


# ── Announcements for the rep's department ───────────────────────────
@router.get("/announcements", response_model=list[AnnouncementOut])
def rep_announcements(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return (db.query(Announcement).filter(Announcement.department_id == rep.department_id)
            .order_by(Announcement.created_at.desc()).all())


@router.post("/announcements", response_model=AnnouncementOut)
def rep_post_announcement(data: AnnouncementCreate, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    a = Announcement(title=data.title.strip(), body=data.body.strip(),
                     department_id=rep.department_id, author_name=f"Class rep {rep.full_name}")
    db.add(a); db.commit(); db.refresh(a)
    return a


@router.delete("/announcements/{aid}", status_code=204)
def rep_delete_announcement(aid: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    a = db.get(Announcement, aid)
    if not a or a.department_id != rep.department_id:
        raise HTTPException(404, "Not found")
    db.delete(a); db.commit()


# ── Forum moderation: posts by students of the rep's department ──────
@router.get("/forum", response_model=list[ForumPostOut])
def rep_forum(db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    posts = (db.query(ForumPost).join(Student, ForumPost.student_id == Student.id)
             .filter(Student.department_id == rep.department_id)
             .order_by(ForumPost.created_at.desc()).limit(200).all())
    return [ForumPostOut(id=p.id, body=p.body, created_at=p.created_at, author_name=p.student.full_name,
                         author_reg_number=p.student.reg_number, mine=(p.student_id == rep.id)) for p in posts]


@router.delete("/forum/{post_id}", status_code=204)
def rep_delete_post(post_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    p = db.get(ForumPost, post_id)
    if not p or p.student.department_id != rep.department_id:
        raise HTTPException(404, "Not found")
    db.delete(p); db.commit()


# ── Password help for students in the rep's department ───────────────
def _own_student(db: Session, rep: Student, reg_number: str) -> Student:
    s = db.query(Student).filter(Student.reg_number == reg_number.strip().upper()).first()
    if not s or s.department_id != rep.department_id:
        raise HTTPException(404, "No student with that registration number in your department")
    return s


@router.get("/students/lookup", response_model=StudentLookupOut)
def rep_lookup(reg_number: str, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    s = _own_student(db, rep, reg_number)
    return StudentLookupOut(id=s.id, reg_number=s.reg_number, full_name=s.full_name)


@router.post("/students/reset-password")
def rep_reset_password(data: StudentPasswordReset, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    s = _own_student(db, rep, data.reg_number)
    if s.is_rep or s.id == rep.id:
        raise HTTPException(403, "Ask the admin to reset a class rep's password")
    if len(data.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    s.hashed_password = hash_password(data.password)
    db.commit()
    return {"ok": True}
