import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, admin, public, student, lecturer, community, gallery, invites, rep, rep_manage, roster

# Creates tables if they don't exist. Fine for local dev; for real
# production changes later, switch to Alembic migrations.
Base.metadata.create_all(bind=engine)


def _add_missing_columns():
    """Adds new columns to existing tables so no manual SQL is needed."""
    from sqlalchemy import inspect, text
    insp = inspect(engine)
    wanted = {
        "students": [("is_rep", "BOOLEAN NOT NULL DEFAULT FALSE")],
        "announcements": [("department_id", "INTEGER"), ("author_name", "VARCHAR")],
        "lecturers": [
            ("is_active", "BOOLEAN NOT NULL DEFAULT TRUE"),
            ("must_change_password", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ]
    }
    with engine.begin() as conn:
        for table, cols in wanted.items():
            if table not in insp.get_table_names():
                continue
            have = {c["name"] for c in insp.get_columns(table)}
            for name, ddl in cols:
                if name not in have:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))


_add_missing_columns()
gallery.seed_gallery()

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        "https://genhub-alertme.onrender.com,http://localhost:5173",
    ).split(",")
    if o.strip()
]

app = FastAPI(title="GenHub API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(student.router)
app.include_router(lecturer.router)
app.include_router(lecturer.account_router)
app.include_router(community.student_router)
app.include_router(community.admin_router)
app.include_router(gallery.public_router)
app.include_router(gallery.admin_router)
app.include_router(invites.rep_router)
app.include_router(invites.admin_router)
app.include_router(rep.router)
app.include_router(rep_manage.router)
app.include_router(roster.admin_router)
app.include_router(roster.rep_router)


@app.get("/")
def root():
    return {"status": "GenHub API is running"}
