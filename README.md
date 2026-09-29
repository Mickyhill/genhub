# GenHub

A student academic platform for a single university. Students register into their faculty, department, level and semester, then see their own courses, timetable and course materials. Admins manage the academic structure, timetables and material uploads.

**Stack:** React, Vite and Axios on the frontend. Python, FastAPI, SQLAlchemy and JWT authentication on the backend. PostgreSQL in production, with SQLite as a local fallback.

**Status:** Stages 1 to 3 built and running locally. Not deployed yet.

## Features

- **Academic profile.** Faculty > Department > Level > Semester > Course hierarchy, managed by admins. Student registration uses cascading dropdowns built from this hierarchy.
- **Timetable.** Admins create timetable entries per course, day, time and venue for each semester. Students see only the timetable for their own enrollment.
- **Course materials.** Admins upload files per course. Students browse and download materials for courses in their own semester only. The server enforces this rule, so hiding a link in the UI is not the only protection.
- **Roles.** Two roles: admin and student, with JWT-based authentication and hashed passwords.

## Project structure

```
backend/
  app/
    core/        config, database session, password hashing, JWT, auth dependencies
    models/      SQLAlchemy models (the database schema)
    schemas/     Pydantic request and response validation
    routers/     auth, admin, public browse, student
    main.py      app entry point, mounts the routers
  uploads/       uploaded material files
frontend/
  src/
    api/client.js   Axios instance and token handling
    pages/          Login, Register, StudentDashboard, CourseMaterials, AdminDashboard
```

## Run locally

### 1. Install PostgreSQL

- **Windows:** download the installer from postgresql.org and note the password you set for the `postgres` user.
- **Mac:** `brew install postgresql@16`, then `brew services start postgresql@16`
- **Linux (Ubuntu/Debian):** `sudo apt install postgresql postgresql-contrib`

Create the database and a user:

```bash
psql -U postgres
```

```sql
CREATE DATABASE genhub;
CREATE USER genhub_user WITH PASSWORD 'genhub_pass';
GRANT ALL PRIVILEGES ON DATABASE genhub TO genhub_user;
\q
```

### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Set the environment variables:

```bash
# Mac/Linux
export DATABASE_URL="postgresql://genhub_user:genhub_pass@localhost:5432/genhub"
export SECRET_KEY="replace-with-a-long-random-string"

# Windows (PowerShell)
$env:DATABASE_URL="postgresql://genhub_user:genhub_pass@localhost:5432/genhub"
$env:SECRET_KEY="replace-with-a-long-random-string"
```

Without `DATABASE_URL`, the app falls back to a local SQLite file (`genhub.db`). SQLite works for a quick test run. PostgreSQL is the target for multiple users and larger material volumes.

Start the server:

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` to test the endpoints in FastAPI's interactive API explorer.

### 3. Create the first admin

The app has no UI for admin sign-up by design. Create the first admin through `/docs` with a POST to `/auth/register/admin`, or with curl:

```bash
curl -X POST http://localhost:8000/auth/register/admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","full_name":"Site Admin","password":"changeme123"}'
```

Change this password after the first login.

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Log in with the admin account or register as a student.

## Known limitations

- **Admin registration.** The `/auth/register/admin` endpoint stays open for local setup only. Before deployment, admin registration will require an existing admin's token or a one-time setup secret.
- **CORS.** CORS currently allows all origins. Before deployment, allowed origins will be limited to the frontend URL.
- **Upload limits.** Materials upload accepts any file type by design. A size cap setting, `MAX_UPLOAD_SIZE_MB`, exists in `core/config.py` and will be enforced before deployment.

## Roadmap

- Lecture reminders: a background job to check the timetable and send alerts before each class.
- Academic performance tracking.
- AI tutor and study planner.

The schema links these future features to the existing `Course` and `Student` models, so the academic hierarchy stays unchanged.

## Author

Michael Churchill, Software Engineering student, Federal University of Technology, Ikot Abasi (FUTIA), Nigeria.
Portfolio: [mickyhill.floot.app](https://mickyhill.floot.app)
