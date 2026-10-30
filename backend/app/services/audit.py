from fastapi import Request
from sqlalchemy.orm import Session

from app.models import ActivityLog, Admin


def client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    return request.client.host if request.client else None


def log_activity(
    db: Session,
    *,
    admin: Admin | None,
    action: str,
    module: str,
    record_id: int | None = None,
    record_label: str | None = None,
    details: dict | None = None,
    request: Request | None = None,
) -> None:
    """Queue an audit record in the current transaction (caller commits)."""
    db.add(ActivityLog(
        admin_id=admin.id if admin else None,
        admin_name=admin.full_name if admin else None,
        action=action,
        module=module,
        record_id=record_id,
        record_label=(record_label or "")[:300] or None,
        details=details,
        ip_address=client_ip(request),
    ))
