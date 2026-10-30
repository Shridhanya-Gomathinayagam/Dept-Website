import os
import tempfile
from pathlib import Path

_tmp = Path(tempfile.mkdtemp(prefix="dept_hub_test_"))
os.environ["ENV"] = "test"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL") or f"sqlite:///{(_tmp / 'test.db').as_posix()}"
os.environ["JWT_SECRET"] = "test-secret-" + "x" * 40
os.environ["CLOUDINARY_URL"] = ""
os.environ["MEDIA_DIR"] = str(_tmp / "media")
os.environ["COOKIE_SECURE"] = "false"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app.api.v1.auth import login_limiter  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Admin  # noqa: E402

BACKEND_DIR = Path(__file__).resolve().parents[1]
PASSWORD = "correct-horse-battery"


@pytest.fixture(scope="session", autouse=True)
def migrated_db():
    """Build the schema exactly as a clean installation would: by running the migrations."""
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    cfg.cmd_opts = type("Opts", (), {"x": [f"url={os.environ['DATABASE_URL']}"]})()
    if os.environ.get("TEST_DATABASE_URL"):
        command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")
    yield
    engine.dispose()


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    login_limiter.clear()
    with engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(text(f'DELETE FROM "{table.name}"'))


@pytest.fixture
def db():
    with SessionLocal() as session:
        yield session


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def make_admin(db, email="admin@dept.edu", superadmin=True, active=True) -> Admin:
    admin = Admin(email=email, full_name="Department Admin", password_hash=hash_password(PASSWORD),
                  is_superadmin=superadmin, is_active=active)
    db.add(admin)
    db.commit()
    return admin


def login(client: TestClient, email="admin@dept.edu", password=PASSWORD):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    if r.status_code == 200:
        client.headers["X-CSRF-Token"] = client.cookies["csrf_token"]
    return r


@pytest.fixture
def admin_client(client, db):
    make_admin(db)
    assert login(client).status_code == 200
    return client


@pytest.fixture
def public_client():
    """A separate client without any cookies (an anonymous visitor)."""
    with TestClient(app) as c:
        yield c
