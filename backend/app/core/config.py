import os

# ── Database ──────────────────────────────────────────────────────────
# For local Postgres (recommended for real use), set DATABASE_URL, e.g.:
#   postgresql://genhub_user:genhub_pass@localhost:5432/genhub
#
# If DATABASE_URL is not set, we fall back to a local SQLite file so the
# app can run with zero setup (useful for quick testing only).
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./genhub.db")

# ── Auth ──────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION_TO_A_RANDOM_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# ── File uploads ──────────────────────────────────────────────────────
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_SIZE_MB = 100
