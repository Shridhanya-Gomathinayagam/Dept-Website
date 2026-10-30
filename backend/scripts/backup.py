"""Back up the database and record the time for the admin Settings page.

    python -m scripts.backup --dir /var/backups/dept-hub --keep 14

SQLite: consistent online copy via the SQLite backup API.
PostgreSQL: `pg_dump --format=custom` (pg_dump must be installed; restore with pg_restore).
Schedule it daily (cron / Windows Task Scheduler) and copy the backup directory off-site.
"""
import argparse
import os
import sqlite3
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.engine import make_url

from app.core.config import get_settings
from app.db.session import SessionLocal
from app.models import SystemStatus


def backup_sqlite(url, target: Path) -> Path:
    out = target.with_suffix(".sqlite3")
    with sqlite3.connect(url.database) as src, sqlite3.connect(out) as dst:
        src.backup(dst)
    return out


def backup_postgres(url, target: Path) -> Path:
    out = target.with_suffix(".dump")
    env = {**os.environ, "PGPASSWORD": url.password or ""}
    cmd = ["pg_dump", "--format=custom", "--no-owner", "-h", url.host or "localhost", "-p", str(url.port or 5432),
           "-U", url.username or "postgres", "-f", str(out), url.database]
    subprocess.run(cmd, check=True, env=env)
    return out


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dir", default=str(Path(__file__).resolve().parents[1] / "backups"))
    parser.add_argument("--keep", type=int, default=14, help="number of most recent backups to keep")
    args = parser.parse_args()

    url = make_url(get_settings().database_url)
    folder = Path(args.dir)
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / f"dept_hub_{datetime.now():%Y%m%d_%H%M%S}"
    try:
        out = backup_sqlite(url, target) if url.get_backend_name() == "sqlite" else backup_postgres(url, target)
    except (subprocess.CalledProcessError, sqlite3.Error, FileNotFoundError) as exc:
        sys.exit(f"Backup FAILED: {exc}")

    backups = sorted(folder.glob("dept_hub_*"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in backups[args.keep:]:
        old.unlink()

    with SessionLocal() as db:
        row = db.get(SystemStatus, "last_backup") or SystemStatus(key="last_backup", value="")
        row.value = out.name
        row.updated_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
    print(f"Backup written: {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
