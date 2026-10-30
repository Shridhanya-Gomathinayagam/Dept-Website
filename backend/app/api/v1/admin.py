"""Admin-only endpoints that are not plain CRUD: uploads, dashboard, logs, gallery images, admins."""
from datetime import date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import models as M
from app.api.deps import require_admin, require_superadmin
from app.core.security import hash_password
from app.crud.resource import paginate
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.modules import GalleryImageIn, GalleryImageRead
from app.services.audit import log_activity
from app.services.storage import store_upload

router = APIRouter(prefix="/admin", tags=["Admin"])


# ------------------------------------------------------------------ uploads
@router.post("/uploads")
def upload(
    request: Request,
    file: UploadFile = File(...),
    kind: Literal["image", "document"] = Form("image"),
    folder: str = Form("misc"),
    db: Session = Depends(get_db),
    admin: M.Admin = Depends(require_admin),
) -> dict:
    stored = store_upload(file, kind, folder)
    log_activity(db, admin=admin, action="UPLOAD", module=folder, record_label=file.filename,
                 details={"url": stored.url, "bytes": stored.bytes, "kind": kind}, request=request)
    db.commit()
    return {"url": stored.url, "public_id": stored.public_id, "kind": stored.kind, "bytes": stored.bytes}


# ------------------------------------------------------------------ dashboard
def _counts(db: Session, model) -> dict:
    rows = dict(db.execute(select(model.status, func.count()).group_by(model.status)).all())
    return {"total": sum(v for k, v in rows.items() if k != "ARCHIVED"), "published": rows.get("PUBLISHED", 0),
            "draft": rows.get("DRAFT", 0)}


DASHBOARD_MODELS = {
    "students": M.Student, "faculty": M.Faculty, "faculty_achievements": M.FacultyAchievement,
    "student_achievements": M.StudentAchievement, "events": M.Event, "opportunities": M.Opportunity,
    "publications": M.Publication, "patents": M.Patent, "projects": M.Project, "alumni": M.Alumnus,
    "news": M.News, "placements": M.Placement, "research_projects": M.ResearchProject,
}


@router.get("/stats")
def dashboard_stats(db: Session = Depends(get_db), admin: M.Admin = Depends(require_admin)) -> dict:
    counts = {k: _counts(db, m) for k, m in DASHBOARD_MODELS.items()}
    counts["upcoming_events"] = db.scalar(
        select(func.count()).select_from(M.Event).where(
            M.Event.start_at >= datetime.now(), M.Event.status != "ARCHIVED",
            M.Event.event_status != "CANCELLED")) or 0
    active = (M.StudentAchievement.status != "ARCHIVED")
    by_year: dict[int, dict] = {}
    for year, n in db.execute(select(M.StudentAchievement.year, func.count()).where(active)
                              .group_by(M.StudentAchievement.year)):
        by_year.setdefault(year, {"year": year, "student": 0, "faculty": 0})["student"] = n
    for year, n in db.execute(select(M.FacultyAchievement.year, func.count())
                              .where(M.FacultyAchievement.status != "ARCHIVED").group_by(M.FacultyAchievement.year)):
        by_year.setdefault(year, {"year": year, "student": 0, "faculty": 0})["faculty"] = n
    by_category = [{"category": c, "count": n} for c, n in db.execute(
        select(M.StudentAchievement.category, func.count()).where(active)
        .group_by(M.StudentAchievement.category).order_by(func.count().desc()))]
    placements = [{"academic_year": y.academic_year, "placed": y.students_placed or 0,
                   "eligible": y.eligible_students or 0}
                  for y in db.scalars(select(M.PlacementYear).where(M.PlacementYear.status != "ARCHIVED")
                                      .order_by(M.PlacementYear.academic_year))]
    publications = [{"year": y, "count": n} for y, n in db.execute(
        select(M.Publication.year, func.count()).where(M.Publication.status != "ARCHIVED")
        .group_by(M.Publication.year).order_by(M.Publication.year))]
    recent = db.scalars(select(M.ActivityLog).order_by(M.ActivityLog.created_at.desc()).limit(8)).all()
    return {
        "counts": counts,
        "achievements_by_year": sorted(by_year.values(), key=lambda r: r["year"])[-8:],
        "student_achievements_by_category": by_category,
        "placements_by_year": placements[-8:],
        "publications_by_year": publications[-10:],
        "recent_activity": [ActivityLogOut.model_validate(r).model_dump(mode="json") for r in recent],
    }


# ------------------------------------------------------------------ activity logs
class ActivityLogOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    admin_name: str | None
    action: str
    module: str
    record_id: int | None
    record_label: str | None
    details: dict | None
    ip_address: str | None
    created_at: datetime


@router.get("/activity-logs", response_model=Page[ActivityLogOut])
def activity_logs(
    module: str | None = Query(None, max_length=50),
    action: str | None = Query(None, max_length=20),
    admin_id: int | None = None,
    q: str | None = Query(None, max_length=100),
    date_from: date | None = None,
    date_to: date | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: M.Admin = Depends(require_admin),
):
    L = M.ActivityLog
    stmt = select(L)
    if module:
        stmt = stmt.where(L.module == module)
    if action:
        stmt = stmt.where(L.action == action)
    if admin_id:
        stmt = stmt.where(L.admin_id == admin_id)
    if q:
        stmt = stmt.where(L.record_label.ilike(f"%{q}%"))
    if date_from:
        stmt = stmt.where(L.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        stmt = stmt.where(L.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time()))
    items, total = paginate(db, stmt.order_by(L.created_at.desc(), L.id.desc()), page, page_size)
    return Page.build([ActivityLogOut.model_validate(i) for i in items], total, page, page_size)


# ------------------------------------------------------------------ system status (backups)
@router.get("/system-status")
def system_status(db: Session = Depends(get_db), admin: M.Admin = Depends(require_admin)) -> dict:
    rows = {r.key: {"value": r.value, "updated_at": r.updated_at} for r in db.scalars(select(M.SystemStatus))}
    return {
        "database": db.get_bind().dialect.name,
        "last_backup": rows.get("last_backup"),
        "status": rows,
    }


# ------------------------------------------------------------------ gallery images
def _album(db: Session, album_id: int) -> M.GalleryAlbum:
    album = db.get(M.GalleryAlbum, album_id)
    if album is None:
        raise HTTPException(404, "Album not found")
    return album


class GalleryImagesIn(BaseModel):
    images: list[GalleryImageIn] = Field(min_length=1, max_length=100)


@router.post("/gallery/{album_id}/images", response_model=list[GalleryImageRead], status_code=201)
def add_gallery_images(album_id: int, body: GalleryImagesIn, request: Request, db: Session = Depends(get_db),
                       admin: M.Admin = Depends(require_admin)):
    album = _album(db, album_id)
    start = max((i.display_order for i in album.images), default=0) + 1
    created = []
    for n, img in enumerate(body.images):
        obj = M.GalleryImage(album_id=album.id, image_url=img.image_url, caption=img.caption,
                             display_order=img.display_order or start + n)
        db.add(obj)
        created.append(obj)
    album.updated_by_id = admin.id
    log_activity(db, admin=admin, action="UPDATE", module="gallery", record_id=album.id,
                 record_label=album.title, details={"images_added": len(created)}, request=request)
    db.commit()
    return [GalleryImageRead.model_validate(o) for o in created]


@router.put("/gallery/images/{image_id}", response_model=GalleryImageRead)
def update_gallery_image(image_id: int, body: GalleryImageIn, db: Session = Depends(get_db),
                         admin: M.Admin = Depends(require_admin)):
    obj = db.get(M.GalleryImage, image_id)
    if obj is None:
        raise HTTPException(404, "Image not found")
    obj.image_url, obj.caption, obj.display_order = body.image_url, body.caption, body.display_order
    db.commit()
    return GalleryImageRead.model_validate(obj)


@router.delete("/gallery/images/{image_id}", status_code=204)
def delete_gallery_image(image_id: int, request: Request, db: Session = Depends(get_db),
                         admin: M.Admin = Depends(require_admin)):
    obj = db.get(M.GalleryImage, image_id)
    if obj is None:
        raise HTTPException(404, "Image not found")
    album = obj.album
    db.delete(obj)
    log_activity(db, admin=admin, action="UPDATE", module="gallery", record_id=album.id,
                 record_label=album.title, details={"image_removed": image_id}, request=request)
    db.commit()


# ------------------------------------------------------------------ admin accounts (super-admin)
class AdminAccountIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=150)
    password: str | None = Field(None, min_length=10, max_length=200)
    is_active: bool = True
    is_superadmin: bool = False


class AdminAccountOut(BaseModel):
    model_config = {"from_attributes": True}
    id: int
    email: str
    full_name: str
    is_active: bool
    is_superadmin: bool
    last_login_at: datetime | None


@router.get("/admins", response_model=list[AdminAccountOut])
def list_admins(db: Session = Depends(get_db), admin: M.Admin = Depends(require_superadmin)):
    return db.scalars(select(M.Admin).order_by(M.Admin.full_name)).all()


@router.post("/admins", response_model=AdminAccountOut, status_code=201)
def create_admin(body: AdminAccountIn, request: Request, db: Session = Depends(get_db),
                 admin: M.Admin = Depends(require_superadmin)):
    if not body.password:
        raise HTTPException(422, "Password is required for a new admin")
    obj = M.Admin(email=body.email.lower(), full_name=body.full_name, password_hash=hash_password(body.password),
                  is_active=body.is_active, is_superadmin=body.is_superadmin)
    db.add(obj)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An admin with this email already exists") from None
    log_activity(db, admin=admin, action="CREATE", module="admins", record_id=obj.id, record_label=obj.email,
                 request=request)
    db.commit()
    return obj


@router.put("/admins/{admin_id}", response_model=AdminAccountOut)
def update_admin(admin_id: int, body: AdminAccountIn, request: Request, db: Session = Depends(get_db),
                 admin: M.Admin = Depends(require_superadmin)):
    obj = db.get(M.Admin, admin_id)
    if obj is None:
        raise HTTPException(404, "Admin not found")
    if obj.id == admin.id and (not body.is_active or not body.is_superadmin):
        raise HTTPException(400, "You cannot deactivate or demote your own account")
    obj.email, obj.full_name = body.email.lower(), body.full_name
    obj.is_active, obj.is_superadmin = body.is_active, body.is_superadmin
    if body.password:
        obj.password_hash = hash_password(body.password)
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "An admin with this email already exists") from None
    log_activity(db, admin=admin, action="UPDATE", module="admins", record_id=obj.id, record_label=obj.email,
                 request=request)
    db.commit()
    return obj
