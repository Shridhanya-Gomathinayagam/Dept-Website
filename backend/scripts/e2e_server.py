"""Start an isolated backend for Playwright end-to-end tests.

Creates a fresh SQLite database via the Alembic migrations, loads the sample data,
creates the E2E admin, then serves the API. Used by frontend/playwright.config.ts.

    E2E_ADMIN_PASSWORD=... python -m scripts.e2e_server --port 8001
"""
import argparse
import os
import secrets
import tempfile
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=8001)
    args = parser.parse_args()

    tmp = Path(tempfile.mkdtemp(prefix="dept_hub_e2e_"))
    os.environ.update(
        ENV="test",
        DATABASE_URL=f"sqlite:///{(tmp / 'e2e.db').as_posix()}",
        MEDIA_DIR=str(tmp / "media"),
        CLOUDINARY_URL="",
        JWT_SECRET=os.environ.get("JWT_SECRET") or secrets.token_urlsafe(48),
    )

    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BACKEND / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND / "alembic"))
    command.upgrade(cfg, "head")

    from app.core.security import hash_password
    from app.db.session import SessionLocal
    from app.models import Admin
    from scripts import seed_dev

    seed_dev.main()
    with SessionLocal() as db:
        db.add(Admin(email=os.environ.get("E2E_ADMIN_EMAIL", "e2e-admin@example.edu"), full_name="E2E Admin",
                     password_hash=hash_password(os.environ["E2E_ADMIN_PASSWORD"]), is_superadmin=True))
        db.commit()

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
