@echo off
cd /d "%~dp0backend"
call venv\Scripts\activate
set DATABASE_URL=postgresql://genhub_user:genhub_pass@localhost:5432/genhub
set SECRET_KEY=my-super-secret-key-12345
uvicorn app.main:app --reload --port 8000
