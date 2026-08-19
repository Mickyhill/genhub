from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, admin, public, student

# Creates tables if they don't exist. Fine for local dev; for real
# production changes later, switch to Alembic migrations.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="GenHub API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend's actual origin in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(public.router)
app.include_router(admin.router)
app.include_router(student.router)


@app.get("/")
def root():
    return {"status": "GenHub API is running"}
