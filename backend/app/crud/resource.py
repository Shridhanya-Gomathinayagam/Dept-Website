"""Generic resource framework.

A `Resource` declares a content module once (model, schemas, filters, search fields) and the
router factories below produce consistent public and admin endpoints for it:

  Public  GET /{key}            paginated list of PUBLISHED records (filters, q, page)
          GET /{key}/facets     distinct values for filter dropdowns
          GET /{key}/{id|slug}  single PUBLISHED record
  Admin   GET/POST /admin/{key}, GET/PUT/DELETE /admin/{key}/{id}, POST /admin/{key}/bulk
"""
import re
import unicodedata
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import date
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import JSON, String, Select, cast, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_admin
from app.db.session import get_db
from app.models import Admin
from app.schemas.common import STATUSES, Page
from app.services.audit import log_activity

PUBLISHED = "PUBLISHED"


@dataclass(frozen=True)
class Filter:
    """A query-string filter.

    op: eq | ilike | gte | lte | json_has | custom
    type: str | int | float | bool | date
    apply: for op="custom", a function (stmt, value) -> stmt
    """

    param: str
    column: str | None = None
    op: str = "eq"
    type: type = str
    apply: Callable[[Select, Any], Select] | None = None
    admin_only: bool = False


@dataclass
class Resource:
    key: str
    label: str
    model: Any
    schema_in: type[BaseModel]
    schema_read: type[BaseModel]
    schema_public: type[BaseModel] | None = None
    schema_public_list: type[BaseModel] | None = None
    title_field: str = "title"
    slug_source: str | None = None
    search_fields: tuple[str, ...] = ()
    admin_search_fields: tuple[str, ...] = ()  # extra fields searchable only in admin
    filters: tuple[Filter, ...] = ()
    facets: tuple[str, ...] = ()
    order_by: Callable[[Any], list] = lambda m: [m.id.desc()]
    fk_checks: dict[str, Any] = field(default_factory=dict)
    public: bool = True
    default_page_size: int = 12

    @property
    def public_schema(self) -> type[BaseModel]:
        return self.schema_public or self.schema_read

    @property
    def public_list_schema(self) -> type[BaseModel]:
        return self.schema_public_list or self.public_schema


# ------------------------------------------------------------------ helpers
def _cast(value: str, typ: type) -> Any:
    if typ is bool:
        if value.lower() in ("true", "1", "yes"):
            return True
        if value.lower() in ("false", "0", "no"):
            return False
        raise ValueError
    if typ is date:
        return date.fromisoformat(value)
    return typ(value)


def apply_filters(res: Resource, stmt: Select, params: Mapping[str, str], admin: bool = False) -> Select:
    for f in res.filters:
        if f.admin_only and not admin:
            continue
        raw = params.get(f.param)
        if raw is None or raw.strip() == "":
            continue
        try:
            value = _cast(raw.strip(), f.type)
        except ValueError:
            raise HTTPException(422, f"Invalid value for filter '{f.param}'") from None
        if f.op == "custom":
            stmt = f.apply(stmt, value)
            continue
        col = getattr(res.model, f.column or f.param)
        if f.op == "eq":
            stmt = stmt.where(col == value)
        elif f.op == "ilike":
            stmt = stmt.where(col.ilike(f"%{_escape_like(value)}%", escape="\\"))
        elif f.op == "gte":
            stmt = stmt.where(col >= value)
        elif f.op == "lte":
            stmt = stmt.where(col <= value)
        elif f.op == "json_has":
            stmt = stmt.where(cast(col, String).ilike(f'%"{_escape_like(value)}"%', escape="\\"))
    return stmt


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def apply_search(model: Any, fields: tuple[str, ...], stmt: Select, q: str | None) -> Select:
    if not q or not fields:
        return stmt
    for term in q.split()[:6]:
        pattern = f"%{_escape_like(term)}%"
        stmt = stmt.where(or_(*[
            (cast(getattr(model, f), String) if isinstance(getattr(model, f).type, JSON) else getattr(model, f))
            .ilike(pattern, escape="\\")
            for f in fields
        ]))
    return stmt


def paginate(db: Session, stmt: Select, page: int, page_size: int) -> tuple[list, int]:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery())) or 0
    items = db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).unique().all()
    return list(items), total


def slugify(text: str) -> str:
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text[:150] or "item"


def unique_slug(db: Session, model: Any, source: str, exclude_id: int | None = None) -> str:
    base = slugify(source)
    slug, n = base, 2
    while True:
        stmt = select(model.id).where(model.slug == slug)
        if exclude_id:
            stmt = stmt.where(model.id != exclude_id)
        if db.scalar(stmt) is None:
            return slug
        slug, n = f"{base}-{n}", n + 1


def label_of(res: Resource, obj: Any) -> str:
    return str(getattr(obj, res.title_field, None) or f"#{obj.id}")


def check_foreign_keys(db: Session, res: Resource, data: dict) -> None:
    for fk, model in res.fk_checks.items():
        value = data.get(fk)
        if value is not None and db.get(model, value) is None:
            raise HTTPException(422, f"Referenced record for '{fk}' does not exist")


def save_record(db: Session, res: Resource, obj: Any | None, data: dict, admin: Admin | None) -> Any:
    """Create (obj=None) or replace fields of a record. Flushes; caller commits."""
    check_foreign_keys(db, res, data)
    creating = obj is None
    old_source = None if creating or not res.slug_source else getattr(obj, res.slug_source)
    if creating:
        obj = res.model()
        obj.created_by_id = admin.id if admin else None
        db.add(obj)
    for k, v in data.items():
        setattr(obj, k, v)
    obj.updated_by_id = admin.id if admin else None
    if res.slug_source and (creating or getattr(obj, res.slug_source) != old_source):
        obj.slug = unique_slug(db, res.model, getattr(obj, res.slug_source), None if creating else obj.id)
    try:
        db.flush()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, _integrity_message(exc)) from None
    return obj


def _integrity_message(exc: IntegrityError) -> str:
    text = str(exc.orig).lower()
    if "unique" in text or "duplicate" in text:
        return "A record with the same unique value (e.g. email, register number, DOI or name) already exists."
    if "foreign key" in text:
        return "This record references a record that does not exist."
    return "The record could not be saved because it conflicts with existing data."


def get_by_ident(db: Session, res: Resource, ident: str, public: bool) -> Any:
    model = res.model
    if ident.isdigit():
        stmt = select(model).where(model.id == int(ident))
    elif hasattr(model, "slug"):
        stmt = select(model).where(model.slug == ident)
    else:
        raise HTTPException(404, f"{res.label} not found")
    if public:
        stmt = stmt.where(model.status == PUBLISHED)
    obj = db.scalars(stmt).unique().first()
    if obj is None:
        raise HTTPException(404, f"{res.label} not found")
    return obj


def facet_values(db: Session, res: Resource, column: str) -> list:
    col = getattr(res.model, column)
    base = select(col).where(res.model.status == PUBLISHED, col.is_not(None))
    if isinstance(col.type, JSON):
        values: set[str] = set()
        for row in db.scalars(base):
            values.update(v for v in (row or []) if isinstance(v, str))
        return sorted(values, key=str.lower)
    rows = db.scalars(base.distinct().order_by(col)).all()
    if rows and isinstance(rows[0], (int, float)):
        return sorted(rows, reverse=True)
    return list(rows)


# ------------------------------------------------------------------ routers
def build_public_router(res: Resource) -> APIRouter:
    router = APIRouter(prefix=f"/{res.key}", tags=[res.label])
    list_schema, detail_schema = res.public_list_schema, res.public_schema

    @router.get("", response_model=Page[list_schema], name=f"list_{res.key}")
    def list_public(
        request: Request,
        q: str | None = Query(None, max_length=100),
        page: int = Query(1, ge=1, le=10000),
        page_size: int = Query(res.default_page_size, ge=1, le=100),
        db: Session = Depends(get_db),
    ):
        stmt = select(res.model).where(res.model.status == PUBLISHED)
        stmt = apply_filters(res, stmt, request.query_params)
        stmt = apply_search(res.model, res.search_fields, stmt, q)
        stmt = stmt.order_by(*res.order_by(res.model))
        items, total = paginate(db, stmt, page, page_size)
        return Page.build([list_schema.model_validate(i) for i in items], total, page, page_size)

    @router.get("/facets", name=f"facets_{res.key}")
    def facets(db: Session = Depends(get_db)) -> dict[str, list]:
        return {c: facet_values(db, res, c) for c in res.facets}

    @router.get("/{ident}", response_model=detail_schema, name=f"get_{res.key}")
    def get_public(ident: str, db: Session = Depends(get_db)):
        return detail_schema.model_validate(get_by_ident(db, res, ident, public=True))

    return router


class BulkAction(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)
    action: Literal["publish", "draft", "archive", "restore", "delete"]
    confirm: bool = False


ACTION_STATUS = {"publish": "PUBLISHED", "draft": "DRAFT", "archive": "ARCHIVED", "restore": "DRAFT"}
ACTION_LOG = {"publish": "PUBLISH", "draft": "UNPUBLISH", "archive": "ARCHIVE", "restore": "RESTORE"}


def admin_list_query(res: Resource, params: Mapping[str, str], q: str | None, status: str | None) -> Select:
    stmt = select(res.model)
    if status and status != "ALL":
        if status not in STATUSES:
            raise HTTPException(422, "Invalid status")
        stmt = stmt.where(res.model.status == status)
    elif not status:
        stmt = stmt.where(res.model.status != "ARCHIVED")
    stmt = apply_filters(res, stmt, params, admin=True)
    stmt = apply_search(res.model, res.search_fields + res.admin_search_fields, stmt, q)
    return stmt.order_by(*res.order_by(res.model))


def build_admin_router(res: Resource) -> APIRouter:
    router = APIRouter(prefix=f"/admin/{res.key}", tags=[f"Admin: {res.label}"])
    schema_in, schema_read = res.schema_in, res.schema_read

    @router.get("", response_model=Page[schema_read], name=f"admin_list_{res.key}")
    def list_admin(
        request: Request,
        q: str | None = Query(None, max_length=100),
        status: str | None = Query(None, description="DRAFT | PUBLISHED | ARCHIVED | ALL (default: not archived)"),
        page: int = Query(1, ge=1),
        page_size: int = Query(20, ge=1, le=100),
        db: Session = Depends(get_db),
        admin: Admin = Depends(require_admin),
    ):
        stmt = admin_list_query(res, request.query_params, q, status)
        items, total = paginate(db, stmt, page, page_size)
        return Page.build([schema_read.model_validate(i) for i in items], total, page, page_size)

    @router.get("/{record_id}", response_model=schema_read, name=f"admin_get_{res.key}")
    def get_admin(record_id: int, db: Session = Depends(get_db), admin: Admin = Depends(require_admin)):
        return schema_read.model_validate(get_by_ident(db, res, str(record_id), public=False))

    @router.post("", response_model=schema_read, status_code=201, name=f"admin_create_{res.key}")
    def create(payload: schema_in, request: Request, db: Session = Depends(get_db),  # type: ignore[valid-type]
               admin: Admin = Depends(require_admin)):
        obj = save_record(db, res, None, payload.model_dump(), admin)
        log_activity(db, admin=admin, action="CREATE", module=res.key, record_id=obj.id,
                     record_label=label_of(res, obj), request=request)
        db.commit()
        db.refresh(obj)
        return schema_read.model_validate(obj)

    @router.put("/{record_id}", response_model=schema_read, name=f"admin_update_{res.key}")
    def update(record_id: int, payload: schema_in, request: Request,  # type: ignore[valid-type]
               db: Session = Depends(get_db), admin: Admin = Depends(require_admin)):
        obj = get_by_ident(db, res, str(record_id), public=False)
        data = payload.model_dump()
        changed = sorted(k for k, v in data.items() if getattr(obj, k) != v)
        obj = save_record(db, res, obj, data, admin)
        log_activity(db, admin=admin, action="UPDATE", module=res.key, record_id=obj.id,
                     record_label=label_of(res, obj), details={"changed": changed}, request=request)
        db.commit()
        db.refresh(obj)
        return schema_read.model_validate(obj)

    @router.delete("/{record_id}", status_code=204, name=f"admin_delete_{res.key}")
    def delete(record_id: int, request: Request, confirm: bool = Query(False),
               db: Session = Depends(get_db), admin: Admin = Depends(require_admin)):
        if not confirm:
            raise HTTPException(400, "Permanent deletion requires confirm=true. Consider archiving instead.")
        obj = get_by_ident(db, res, str(record_id), public=False)
        label = label_of(res, obj)
        db.delete(obj)
        log_activity(db, admin=admin, action="DELETE", module=res.key, record_id=record_id,
                     record_label=label, request=request)
        db.commit()

    @router.post("/bulk", name=f"admin_bulk_{res.key}")
    def bulk(body: BulkAction, request: Request, db: Session = Depends(get_db),
             admin: Admin = Depends(require_admin)) -> dict:
        if body.action == "delete" and not body.confirm:
            raise HTTPException(400, "Permanent deletion requires confirm=true.")
        objs = db.scalars(select(res.model).where(res.model.id.in_(body.ids))).unique().all()
        for obj in objs:
            if body.action == "delete":
                db.delete(obj)
                action = "DELETE"
            else:
                obj.status = ACTION_STATUS[body.action]
                obj.updated_by_id = admin.id
                action = ACTION_LOG[body.action]
            log_activity(db, admin=admin, action=action, module=res.key, record_id=obj.id,
                         record_label=label_of(res, obj), request=request)
        db.commit()
        return {"updated": len(objs)}

    return router

