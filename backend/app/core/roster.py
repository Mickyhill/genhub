"""Reads a class list (Excel or CSV) and saves it as a department roster."""
import csv
import io
import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.core.reg_number import parse_reg_number
from app.models import Department, RosterEntry

MAX_BYTES = 2 * 1024 * 1024
MAX_ROWS = 3000


def clean_reg(value) -> str:
    return re.sub(r"\s+", "", str(value or "")).upper()


def clean_name(value) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _rows(filename: str, data: bytes):
    name = (filename or "").lower()
    if name.endswith(".xlsx") or name.endswith(".xlsm"):
        from openpyxl import load_workbook
        try:
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
        except Exception:
            raise HTTPException(400, "This file could not be opened. Save it as .xlsx or .csv and try again.")
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            yield list(row)
    elif name.endswith(".csv") or name.endswith(".txt"):
        text = data.decode("utf-8-sig", errors="replace")
        for row in csv.reader(io.StringIO(text)):
            yield row
    else:
        raise HTTPException(400, "Upload an Excel file (.xlsx) or a .csv file.")


def parse_roster(filename: str, data: bytes):
    """Returns a list of (reg_number, full_name, row_number) plus a list of problems.
    Needs no header row. In each row it finds the cell shaped like a reg number, and the name is the other text cell."""
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "File is too big. Keep it under 2 MB.")
    found, problems = [], []
    for n, row in enumerate(_rows(filename, data), start=1):
        if n > MAX_ROWS + 1:
            raise HTTPException(400, f"Too many rows. The limit is {MAX_ROWS} students per file.")
        cells = [c for c in row if c is not None and str(c).strip() != ""]
        if not cells:
            continue
        reg, name = None, None
        for c in cells:
            v = clean_reg(c)
            try:
                parse_reg_number(v)
                reg = v
                break
            except ValueError:
                continue
        if reg is None:
            # header rows and notes are skipped quietly, a row with a name-like cell and no reg gets reported
            joined = " ".join(str(c).lower() for c in cells)
            if "reg" in joined or "name" in joined or "s/n" in joined or "sn" in joined.split():
                continue
            problems.append(f"Row {n}: no registration number found")
            continue
        for c in cells:
            t = clean_name(c)
            if clean_reg(c) == reg:
                continue
            if re.search(r"[A-Za-z]{2,}", t) and not re.fullmatch(r"[\d\W_]+", t):
                name = t
                break
        if not name:
            problems.append(f"Row {n}: {reg} has no name")
            continue
        found.append((reg, name, n))
    return found, problems


def save_roster(db: Session, department: Department, found, problems):
    """Adds new students, updates names of listed ones. Skips numbers that belong to another department."""
    fac_code = department.faculty.code
    dept_code = department.code
    added = updated = 0
    skipped = list(problems)
    seen = set()
    existing = {r.reg_number: r for r in db.query(RosterEntry).filter(
        RosterEntry.reg_number.in_([f[0] for f in found] or [""])).all()}
    for reg, name, n in found:
        if reg in seen:
            skipped.append(f"Row {n}: {reg} appears twice")
            continue
        seen.add(reg)
        _y, fc, dc, _num = parse_reg_number(reg)
        if fc != fac_code or dc != dept_code:
            skipped.append(f"Row {n}: {reg} is not a {fac_code}/{dept_code} number")
            continue
        row = existing.get(reg)
        if row is not None:
            if row.department_id != department.id:
                skipped.append(f"Row {n}: {reg} belongs to another department")
                continue
            if row.full_name != name:
                row.full_name = name
                updated += 1
        else:
            db.add(RosterEntry(department_id=department.id, reg_number=reg, full_name=name))
            added += 1
    db.commit()
    return {"added": added, "updated": updated, "skipped": len(skipped), "problems": skipped[:25]}


def roster_name(db: Session, department_id: int, reg_number: str):
    """Returns (has_roster, name_or_None) for this department and number."""
    has = db.query(RosterEntry.id).filter(RosterEntry.department_id == department_id).first() is not None
    if not has:
        return False, None
    row = db.query(RosterEntry).filter(RosterEntry.reg_number == reg_number,
                                       RosterEntry.department_id == department_id).first()
    return True, (row.full_name if row else None)
