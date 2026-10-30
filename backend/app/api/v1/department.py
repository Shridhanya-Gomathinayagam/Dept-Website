from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import Admin, Department
from app.schemas.modules import DepartmentIn, DepartmentRead
from app.services.audit import log_activity

router = APIRouter(tags=["Department"])


def get_department(db: Session) -> Department | None:
    return db.scalar(select(Department).order_by(Department.id).limit(1))


@router.get("/department", response_model=DepartmentRead)
def read_department(db: Session = Depends(get_db)):
    dept = get_department(db)
    if dept is None:
        raise HTTPException(404, "Department profile has not been set up yet")
    return dept


@router.get("/admin/department", response_model=DepartmentRead | None)
def admin_read_department(db: Session = Depends(get_db), admin: Admin = Depends(require_admin)):
    return get_department(db)


@router.put("/admin/department", response_model=DepartmentRead)
def update_department(payload: DepartmentIn, request: Request, db: Session = Depends(get_db),
                      admin: Admin = Depends(require_admin)):
    dept = get_department(db)
    action = "UPDATE"
    if dept is None:
        dept = Department()
        db.add(dept)
        action = "CREATE"
    data = payload.model_dump(mode="json")
    changed = sorted(k for k, v in data.items() if getattr(dept, k, None) != v)
    for k, v in data.items():
        setattr(dept, k, v)
    db.flush()
    log_activity(db, admin=admin, action=action, module="department", record_id=dept.id,
                 record_label=dept.name, details={"changed": changed}, request=request)
    db.commit()
    db.refresh(dept)
    return dept
