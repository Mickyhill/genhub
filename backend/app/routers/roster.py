"""Department rosters. The admin manages any department. A class rep manages only their own."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_admin, get_current_rep
from app.core.reg_number import parse_reg_number
from app.core.roster import clean_name, clean_reg, parse_roster, save_roster
from app.models import Department, RosterEntry, Student
from app.schemas.academic import RosterEntryCreate, RosterEntryOut, RosterListOut, RosterUploadOut

admin_router = APIRouter(prefix="/admin/roster", tags=["roster"], dependencies=[Depends(get_current_admin)])
rep_router = APIRouter(prefix="/rep/manage/roster", tags=["roster"])


def _dept(db: Session, department_id: int) -> Department:
    d = db.get(Department, department_id)
    if not d:
        raise HTTPException(404, "Department not found")
    return d


def _list(db: Session, dept: Department, q: str, limit: int) -> RosterListOut:
    base = db.query(RosterEntry).filter(RosterEntry.department_id == dept.id)
    total = base.count()
    registered = (
        db.query(func.count(Student.id))
        .join(RosterEntry, RosterEntry.reg_number == Student.reg_number)
        .filter(RosterEntry.department_id == dept.id).scalar() or 0
    )
    q = q.strip()
    if q:
        like = "%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        base = base.filter((RosterEntry.reg_number.ilike(like, escape="\\")) | (RosterEntry.full_name.ilike(like, escape="\\")))
    items = base.order_by(RosterEntry.reg_number).limit(limit).all()
    return RosterListOut(total=total, registered=registered, items=items)


def _add_one(db: Session, dept: Department, data: RosterEntryCreate) -> RosterEntry:
    reg, name = clean_reg(data.reg_number), clean_name(data.full_name)
    try:
        _y, fc, dc, _n = parse_reg_number(reg)
    except ValueError as e:
        raise HTTPException(400, str(e))
    if fc != dept.faculty.code or dc != dept.code:
        raise HTTPException(400, f"This is not a {dept.faculty.code}/{dept.code} number")
    if not name:
        raise HTTPException(400, "Enter the student's name")
    row = db.query(RosterEntry).filter(RosterEntry.reg_number == reg).first()
    if row and row.department_id != dept.id:
        raise HTTPException(400, "This number belongs to another department")
    if row:
        row.full_name = name
    else:
        row = RosterEntry(department_id=dept.id, reg_number=reg, full_name=name)
        db.add(row)
    db.commit(); db.refresh(row)
    return row


async def _upload(db: Session, dept: Department, file: UploadFile) -> RosterUploadOut:
    data = await file.read()
    found, problems = parse_roster(file.filename, data)
    if not found:
        raise HTTPException(400, "No students found. Each row needs a registration number and a name.")
    return RosterUploadOut(**save_roster(db, dept, found, problems))


# ── Admin: any department ────────────────────────────────────────────
@admin_router.get("", response_model=RosterListOut)
def admin_list(department_id: int, q: str = Query("", max_length=60), limit: int = Query(100, le=500), db: Session = Depends(get_db)):
    return _list(db, _dept(db, department_id), q, limit)


@admin_router.post("/upload", response_model=RosterUploadOut)
async def admin_upload(department_id: int = Form(...), file: UploadFile = File(...), db: Session = Depends(get_db)):
    return await _upload(db, _dept(db, department_id), file)


@admin_router.post("", response_model=RosterEntryOut)
def admin_add(department_id: int, data: RosterEntryCreate, db: Session = Depends(get_db)):
    return _add_one(db, _dept(db, department_id), data)


@admin_router.delete("/{entry_id}", status_code=204)
def admin_delete(entry_id: int, db: Session = Depends(get_db)):
    row = db.get(RosterEntry, entry_id)
    if not row:
        raise HTTPException(404, "Not found")
    db.delete(row); db.commit()


# ── Class rep: own department only ───────────────────────────────────
@rep_router.get("", response_model=RosterListOut)
def rep_list(q: str = Query("", max_length=60), limit: int = Query(100, le=500), db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return _list(db, _dept(db, rep.department_id), q, limit)


@rep_router.post("/upload", response_model=RosterUploadOut)
async def rep_upload(file: UploadFile = File(...), db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return await _upload(db, _dept(db, rep.department_id), file)


@rep_router.post("", response_model=RosterEntryOut)
def rep_add(data: RosterEntryCreate, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    return _add_one(db, _dept(db, rep.department_id), data)


@rep_router.delete("/{entry_id}", status_code=204)
def rep_delete(entry_id: int, db: Session = Depends(get_db), rep: Student = Depends(get_current_rep)):
    row = db.get(RosterEntry, entry_id)
    if not row or row.department_id != rep.department_id:
        raise HTTPException(404, "Not found")
    db.delete(row); db.commit()
