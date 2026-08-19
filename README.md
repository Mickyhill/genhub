# GenHub — Stages 1–3

Academic Profile (hierarchy + enrollment) → Timetable → Materials.

Single university, generic Faculty → Department → Level → Semester → Course
hierarchy underneath. Two roles: **admin** (manages structure, timetable,
materials) and **student** (registers into a dept/level/semester, views
their courses/timetable, downloads materials).

## 1. Install PostgreSQL locally

**Windows:** download installer from postgresql.org, run it, remember the
password you set for the `postgres` user.

**Mac:** `brew install postgresql@16` then `brew services start postgresql@16`

**Linux (Ubuntu/Debian):** `sudo apt install postgresql postgresql-contrib`

Then create the database and a user:

```bash
psql -U postgres
```
```sql
CREATE DATABASE genhub;
CREATE USER genhub_user WITH PASSWORD 'genhub_pass';
GRANT ALL PRIVILEGES ON DATABASE genhub TO genhub_user;
\q
```

## 2. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set your database URL (point at the Postgres you just created):

```bash
# Mac/Linux
export DATABASE_URL="postgresql://genhub_user:genhub_pass@localhost:5432/genhub"

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://genhub_user:genhub_pass@localhost:5432/genhub"
```

If you skip this step, the app falls back to a local SQLite file
(`genhub.db`) — fine for a first test run, but switch to Postgres before
you rely on this for real, since SQLite won't hold up with concurrent
users or larger file/material volumes.

Also set a real secret for JWT signing (any random string):
```bash
export SECRET_KEY="something-long-and-random"
```

Run it:

```bash
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/docs` — this is FastAPI's auto-generated
interactive API explorer. Use it to sanity-check endpoints directly
before touching the frontend.

**First thing to do:** create your first admin account, since there's no
UI for it yet (by design — you don't want a public "become admin" button).
Either use `/docs` to POST to `/auth/register/admin`, or:

```bash
curl -X POST http://localhost:8000/auth/register/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","full_name":"Site Admin","password":"changeme123"}'
```

## 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Log in with the admin account above, or
register as a student.

## What's built (Stages 1–3)

- **Stage 1 — Academic Profile:** Faculty → Department → Level → Semester
  → Course hierarchy, fully admin-managed. Student registration walks
  through cascading dropdowns built from this hierarchy.
- **Stage 2 — Timetable:** Admin sets timetable entries per
  (course, day, time, venue) scoped to a semester. Students see only the
  timetable matching their own enrollment.
- **Stage 3 — Materials:** Admin uploads any file type per course.
  Students can only browse/download materials for courses in their own
  semester (enforced server-side, not just hidden in the UI).

## Known gaps / next steps (intentionally deferred)

- **Lecture reminders/notifications** — not built yet (Phase 2 extension).
  This is where you'd add a background job that checks the timetable and
  pushes alerts before class starts.
- **Performance tracking, AI tutor, study planner** — later phases, per
  the roadmap. The schema is structured so these can hang off `Course`
  and `Student` without reworking the hierarchy.
- **Admin registration endpoint is open** (`/auth/register/admin`) — fine
  for local setup, but lock it down before any real deployment (e.g.
  require an existing admin's token, or a one-time setup secret).
- **CORS is wide open** (`allow_origins=["*"]`) — tighten to your actual
  frontend URL before deploying anywhere public.
- **No file type/size validation** on materials upload, per your call to
  allow any file type — you may still want a size cap in production to
  avoid disk exhaustion (there's a `MAX_UPLOAD_SIZE_MB` config value
  already sitting unused in `core/config.py` if you want to wire it in).

## Project structure

```
backend/
  app/
    core/        # config, db session, security (hashing/JWT), auth deps
    models/       # SQLAlchemy models = the actual schema
    schemas/      # Pydantic request/response validation
    routers/      # auth, admin, public (browse), student
    main.py       # app entrypoint, mounts routers
  uploads/        # uploaded material files land here
frontend/
  src/
    api/client.js # axios instance + token handling
    pages/        # Login, Register, StudentDashboard, CourseMaterials, AdminDashboard
```
