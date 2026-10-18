import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, admin, public, student, lecturer, community

# Creates tables if they don't exist. Fine for local dev; for real
# production changes later, switch to Alembic migrations.
Base.metadata.create_all(bind=engine)

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
app.include_router(community.student_router)
app.include_router(community.admin_router)


@app.get("/")
def root():
    return {"status": "GenHub API is running"}
