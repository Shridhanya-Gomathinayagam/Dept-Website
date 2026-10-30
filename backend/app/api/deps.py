import secrets

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.security import AUTH_COOKIE, CSRF_COOKIE, CSRF_HEADER, decode_access_token
from app.db.session import get_db
from app.models import Admin

SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def get_current_admin(request: Request, db: Session = Depends(get_db)) -> Admin:
    token = request.cookies.get(AUTH_COOKIE)
    admin_id = decode_access_token(token) if token else None
    admin = db.get(Admin, admin_id) if admin_id else None
    if admin is None or not admin.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return admin


def verify_csrf(request: Request) -> None:
    """Double-submit check: the header must match the csrf cookie on unsafe requests."""
    if request.method in SAFE_METHODS:
        return
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    if not cookie or not header or not secrets.compare_digest(cookie, header):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "CSRF token missing or invalid")


def require_admin(request: Request, db: Session = Depends(get_db)) -> Admin:
    verify_csrf(request)
    return get_current_admin(request, db)


def require_superadmin(admin: Admin = Depends(require_admin)) -> Admin:
    if not admin.is_superadmin:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Super-admin permission required")
    return admin
