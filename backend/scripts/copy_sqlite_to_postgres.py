"""One-time move of all data from a SQLite database into an empty PostgreSQL database.

    alembic upgrade head                      # with DATABASE_URL pointing at PostgreSQL
    python -m scripts.copy_sqlite_to_postgres --sqlite dept_hub.db

Copies every table in dependency order inside one transaction, then resets id sequences.
Refuses to run if the target already contains content.
"""
import argparse
import sys
from pathlib import Path

from sqlalchemy import create_engine, func, insert, select, text

import app.models  # noqa: F401  (register tables)
from app.core.config import get_settings
from app.db.base import Base


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite", default="dept_hub.db", help="path to the SQLite database file")
    args = parser.parse_args()

    src_path = Path(args.sqlite).resolve()
    if not src_path.exists():
        sys.exit(f"SQLite file not found: {src_path}")
    target_url = get_settings().database_url
    if not target_url.startswith("postgresql"):
        sys.exit("DATABASE_URL must point at PostgreSQL")

    src = create_engine(f"sqlite:///{src_path.as_posix()}")
    dst = create_engine(target_url)
    tables = [t for t in Base.metadata.sorted_tables]

    with src.connect() as s, dst.begin() as d:
        if any(d.scalar(select(func.count()).select_from(t)) for t in tables):
            sys.exit("Target database is not empty; nothing copied.")
        for table in tables:
            rows = [dict(r._mapping) for r in s.execute(select(table))]
            if rows:
                d.execute(insert(table), rows)
            print(f"{table.name:24} {len(rows):6} rows")
        for table in tables:
            pk = list(table.primary_key.columns)
            if len(pk) == 1 and pk[0].autoincrement and pk[0].type.python_type is int:
                d.execute(text(
                    f"SELECT setval(pg_get_serial_sequence('{table.name}', '{pk[0].name}'), "
                    f"COALESCE((SELECT MAX({pk[0].name}) FROM {table.name}), 0) + 1, false)"
                ))
    print("Copy complete.")


if __name__ == "__main__":
    main()
