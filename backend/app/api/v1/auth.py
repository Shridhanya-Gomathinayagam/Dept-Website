from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_admin, require_admin
from app.core.config import get_settings
from app.core.rate_limit import SlidingWindowLimiter
from app.core.security import (
    AUTH_COOKIE,
    CSRF_COOKIE,
    create_access_token,
    hash_password,
    new_csrf_token,
    verify_password,
)
from app.db.base import utcnow
from app.db.session import get_db
from app.models import Admin
from app.services.audit import client_ip, log_activity

router = APIRouter(prefix="/auth", tags=["Auth"])

_settings = get_settings()
login_limiter = SlidingWindowLimiter(_settings.login_max_attempts, _settings.login_window_seconds)
# Constant-time-ish rejection for unknown emails (avoid user enumeration by timing).
_DUMMY_HASH = hash_password("not-a-real-password")


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AdminOut(BaseModel):
    id: int
    email: str
    full_name: str
    is_superadmin: bool


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=200)
    new_password: str = Field(min_length=10, max_length=200)


def _set_auth_cookies(response: Response, admin_id: int) -> None:
    settings = get_settings()
    max_age = settings.jwt_expire_minutes * 60
    common = {"secure": settings.cookie_secure, "samesite": "lax", "path": "/", "max_age": max_age}
    response.set_cookie(AUTH_COOKIE, create_access_token(admin_id), httponly=True, **common)
    response.set_cookie(CSRF_COOKIE, new_csrf_token(), httponly=False, **common)


def _out(admin: Admin) -> AdminOut:
    return AdminOut(id=admin.id, email=admin.email, full_name=admin.full_name, is_superadmin=admin.is_superadmin)


@router.post("/login", response_model=AdminOut)
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    ip = client_ip(request) or "unknown"
    keys = (f"ip:{ip}", f"email:{body.email.lower()}")
    if any(login_limiter.is_blocked(k) for k in keys):
        raise HTTPException(429, "Too many failed login attempts. Please try again in a few minutes.")

    admin = db.scalar(select(Admin).where(func.lower(Admin.email) == body.email.lower()))
    valid = verify_password(body.password, admin.password_hash if admin else _DUMMY_HASH)
    if not admin or not valid or not admin.is_active:
        for k in keys:
            login_limiter.hit(k)
        log_activity(db, admin=None, action="LOGIN_FAILED", module="auth", record_label=body.email.lower(),
                     request=request)
        db.commit()
        raise HTTPException(401, "Invalid email or password")

    login_limiter.reset(keys[1])
    admin.last_login_at = utcnow()
    log_activity(db, admin=admin, action="LOGIN", module="auth", record_id=admin.id,
                 record_label=admin.email, request=request)
    db.commit()
    _set_auth_cookies(response, admin.id)
    return _out(admin)


@router.post("/logout", status_code=204)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    try:
        admin = get_current_admin(request, db)
        log_activity(db, admin=admin, action="LOGOUT", module="auth", record_id=admin.id,
                     record_label=admin.email, request=request)
        db.commit()
    except HTTPException:
        pass
    response.delete_cookie(AUTH_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(get_current_admin)):
    return _out(admin)


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordIn, request: Request, db: Session = Depends(get_db),
                    admin: Admin = Depends(require_admin)):
    if not verify_password(body.current_password, admin.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    admin.password_hash = hash_password(body.new_password)
    log_activity(db, admin=admin, action="UPDATE", module="auth", record_id=admin.id,
                 record_label="Password changed", request=request)
    db.commit()
