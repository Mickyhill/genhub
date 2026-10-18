"""Community features. Students and admins get separate routers; lecturers
have no access to any of this (announcements never reach them)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_student, get_current_admin
from app.models import Student, Announcement, ForumPost, SupportMessage, Suggestion
from app.schemas.community import (
    AnnouncementCreate, AnnouncementOut, TextBody, ForumPostOut,
    SupportMessageOut, SupportThreadOut, SuggestionOut,
)

student_router = APIRouter(prefix="/student/community", tags=["community"])
admin_router = APIRouter(prefix="/admin/community", tags=["community-admin"], dependencies=[Depends(get_current_admin)])


def _post_out(p: ForumPost, viewer_id=None, admin=False) -> ForumPostOut:
    return ForumPostOut(
        id=p.id, body=p.body, created_at=p.created_at,
        author_name=p.student.full_name,
        author_reg_number=p.student.reg_number if admin else None,
        mine=(viewer_id is not None and p.student_id == viewer_id),
    )


# ── Student side ──────────────────────────────────────────────────────
@student_router.get("/announcements", response_model=list[AnnouncementOut])
def s_announcements(db: Session = Depends(get_db), _: Student = Depends(get_current_student)):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).limit(50).all()


@student_router.get("/forum", response_model=list[ForumPostOut])
def s_forum(db: Session = Depends(get_db), me: Student = Depends(get_current_student)):
    posts = db.query(ForumPost).order_by(ForumPost.created_at.desc()).limit(100).all()
    return [_post_out(p, me.id) for p in posts]


@student_router.post("/forum", response_model=ForumPostOut)
def s_forum_post(data: TextBody, db: Session = Depends(get_db), me: Student = Depends(get_current_student)):
    post = ForumPost(student_id=me.id, body=data.body.strip())
    db.add(post); db.commit(); db.refresh(post)
    return _post_out(post, me.id)


@student_router.delete("/forum/{post_id}", status_code=204)
def s_forum_delete(post_id: int, db: Session = Depends(get_db), me: Student = Depends(get_current_student)):
    post = db.query(ForumPost).filter(ForumPost.id == post_id, ForumPost.student_id == me.id).first()
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Post not found")
    db.delete(post); db.commit()


@student_router.get("/support", response_model=list[SupportMessageOut])
def s_support(db: Session = Depends(get_db), me: Student = Depends(get_current_student)):
    return db.query(SupportMessage).filter(SupportMessage.student_id == me.id).order_by(SupportMessage.created_at).all()


@student_router.post("/support", response_model=SupportMessageOut)
def s_support_send(data: TextBody, db: Session = Depends(get_db), me: Student = Depends(get_current_student)):
    m = SupportMessage(student_id=me.id, sender_role="student", body=data.body.strip())
    db.add(m); db.commit(); db.refresh(m)
    return m


@student_router.post("/suggestions", status_code=201)
def s_suggest(data: TextBody, db: Session = Depends(get_db), _: Student = Depends(get_current_student)):
    # Login is required (stops spam) but nothing identifying is stored.
    db.add(Suggestion(body=data.body.strip())); db.commit()
    return {"ok": True}


# ── Admin side ────────────────────────────────────────────────────────
@admin_router.get("/announcements", response_model=list[AnnouncementOut])
def a_announcements(db: Session = Depends(get_db)):
    return db.query(Announcement).order_by(Announcement.created_at.desc()).all()


@admin_router.post("/announcements", response_model=AnnouncementOut)
def a_announce(data: AnnouncementCreate, db: Session = Depends(get_db)):
    a = Announcement(title=data.title.strip(), body=data.body.strip())
    db.add(a); db.commit(); db.refresh(a)
    return a


@admin_router.delete("/announcements/{aid}", status_code=204)
def a_announce_delete(aid: int, db: Session = Depends(get_db)):
    a = db.get(Announcement, aid)
    if not a:
        raise HTTPException(404, "Not found")
    db.delete(a); db.commit()


@admin_router.get("/forum", response_model=list[ForumPostOut])
def a_forum(db: Session = Depends(get_db)):
    posts = db.query(ForumPost).order_by(ForumPost.created_at.desc()).limit(200).all()
    return [_post_out(p, admin=True) for p in posts]


@admin_router.delete("/forum/{post_id}", status_code=204)
def a_forum_delete(post_id: int, db: Session = Depends(get_db)):
    p = db.get(ForumPost, post_id)
    if not p:
        raise HTTPException(404, "Not found")
    db.delete(p); db.commit()


@admin_router.get("/support", response_model=list[SupportThreadOut])
def a_support_threads(db: Session = Depends(get_db)):
    msgs = db.query(SupportMessage).order_by(SupportMessage.created_at.desc()).all()
    seen, out = set(), []
    for m in msgs:  # newest first, so first hit per student is the latest message
        if m.student_id in seen:
            continue
        seen.add(m.student_id)
        out.append(SupportThreadOut(
            student_id=m.student_id, student_name=m.student.full_name,
            reg_number=m.student.reg_number, last_message=m.body[:120],
            last_at=m.created_at, awaiting_reply=(m.sender_role == "student"),
        ))
    out.sort(key=lambda t: (not t.awaiting_reply, -t.last_at.timestamp()))
    return out


@admin_router.get("/support/{student_id}", response_model=list[SupportMessageOut])
def a_support_thread(student_id: int, db: Session = Depends(get_db)):
    return db.query(SupportMessage).filter(SupportMessage.student_id == student_id).order_by(SupportMessage.created_at).all()


@admin_router.post("/support/{student_id}", response_model=SupportMessageOut)
def a_support_reply(student_id: int, data: TextBody, db: Session = Depends(get_db)):
    if not db.get(Student, student_id):
        raise HTTPException(404, "Student not found")
    m = SupportMessage(student_id=student_id, sender_role="admin", body=data.body.strip())
    db.add(m); db.commit(); db.refresh(m)
    return m


@admin_router.get("/suggestions", response_model=list[SuggestionOut])
def a_suggestions(db: Session = Depends(get_db)):
    return db.query(Suggestion).order_by(Suggestion.created_at.desc()).all()


@admin_router.delete("/suggestions/{sid}", status_code=204)
def a_suggestion_delete(sid: int, db: Session = Depends(get_db)):
    s = db.get(Suggestion, sid)
    if not s:
        raise HTTPException(404, "Not found")
    db.delete(s); db.commit()
