"""Create (or reset the password of) an administrator account.

Usage:
    python -m scripts.create_admin --email hod@college.edu --name "Department Admin" [--superadmin]
The password is prompted for (never passed on the command line).
"""
import argparse
import getpass
import sys

from sqlalchemy import func, select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import Admin


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--superadmin", action="store_true")
    parser.add_argument("--password-stdin", action="store_true", help="read password from stdin (automation)")
    args = parser.parse_args()

    if args.password_stdin:
        password = sys.stdin.readline().strip()
    else:
        password = getpass.getpass("Password (min 10 chars): ")
        if password != getpass.getpass("Repeat password: "):
            sys.exit("Passwords do not match")
    if len(password) < 10:
        sys.exit("Password must be at least 10 characters")

    with SessionLocal() as db:
        admin = db.scalar(select(Admin).where(func.lower(Admin.email) == args.email.lower()))
        if admin:
            admin.password_hash = hash_password(password)
            admin.full_name = args.name
            admin.is_active = True
            admin.is_superadmin = admin.is_superadmin or args.superadmin
            print(f"Updated admin {admin.email}")
        else:
            db.add(Admin(email=args.email.lower(), full_name=args.name, password_hash=hash_password(password),
                         is_superadmin=args.superadmin))
            print(f"Created admin {args.email.lower()}")
        db.commit()


if __name__ == "__main__":
    main()
