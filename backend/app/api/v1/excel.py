from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import models as M
from app.api.deps import require_admin
from app.core.config import get_settings
from app.crud.resource import admin_list_query, save_record
from app.db.base import utcnow
from app.db.session import get_db
from app.services import excel as X
from app.services.audit import log_activity

router = APIRouter(prefix="/admin/excel", tags=["Admin: Excel"])
XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
SESSION_TTL = timedelta(minutes=30)


def _xlsx(content: bytes, filename: str) -> Response:
    return Response(content, media_type=XLSX, headers={"Content-Disposition": f'attachment; filename="{filename}"'})


@router.get("/entities")
def entities(admin: M.Admin = Depends(require_admin)) -> list[dict]:
    out = []
    for spec in X.SPECS.values():
        res = spec.resource
        out.append({
            "entity": spec.entity,
            "label": res.label,
            "resource": res.key,
            "columns": [c.header for c in X.all_columns(spec)],
            "filters": [f.param for f in res.filters],
        })
    return out


@router.get("/templates/{entity}")
def template(entity: str, admin: M.Admin = Depends(require_admin)):
    spec = X.get_spec(entity)
    return _xlsx(X.build_template(spec), f"{entity}.xlsx")


@router.post("/{entity}/preview")
def preview(
    entity: str,
    request: Request,
    file: UploadFile = File(...),
    default_status: Literal["DRAFT", "PUBLISHED"] = Form("DRAFT"),
    db: Session = Depends(get_db),
    admin: M.Admin = Depends(require_admin),
) -> dict:
    spec = X.get_spec(entity)
    if not (file.filename or "").lower().endswith(".xlsx"):
        raise HTTPException(400, "Please upload an .xlsx file")
    max_bytes = get_settings().max_excel_mb * 1024 * 1024
    content = file.file.read(max_bytes + 1)
    if len(content) > max_bytes:
        raise HTTPException(413, f"File too large (max {get_settings().max_excel_mb} MB)")
    rows, warnings = X.build_preview(db, spec, content)
    summary = X.summarize(rows)
    session = M.ImportSession(
        admin_id=admin.id, entity=entity, filename=(file.filename or "upload.xlsx")[:255],
        default_status=default_status,
        payload=[r.__dict__ for r in rows if r.action in ("new", "update")],
        summary=summary, expires_at=utcnow() + SESSION_TTL,
    )
    db.add(session)
    db.commit()
    return {
        "import_id": session.id,
        "entity": entity,
        "filename": session.filename,
        "summary": summary,
        "warnings": warnings,
        "rows": [r.__dict__ for r in rows],
    }


@router.post("/imports/{import_id}/commit")
def commit(import_id: int, request: Request, db: Session = Depends(get_db),
           admin: M.Admin = Depends(require_admin)) -> dict:
    session = db.get(M.ImportSession, import_id)
    if session is None or session.admin_id != admin.id:
        raise HTTPException(404, "Import not found")
    if session.committed_at is not None:
        raise HTTPException(409, "This import has already been applied")
    expires = session.expires_at if session.expires_at.tzinfo else session.expires_at.replace(tzinfo=utcnow().tzinfo)
    if expires < utcnow():
        raise HTTPException(410, "This preview has expired. Please upload the file again.")
    spec = X.get_spec(session.entity)
    res = spec.resource
    created = updated = 0
    try:
        for row in session.payload:
            data = dict(row["data"])
            if row["action"] == "new":
                data.setdefault("status", session.default_status)
                payload = res.schema_in.model_validate(data).model_dump()
                save_record(db, res, None, payload, admin)
                created += 1
            else:
                obj = db.get(res.model, row["record_id"])
                if obj is None:
                    raise HTTPException(409, f"Row {row['row']}: the matching record no longer exists")
                current = res.schema_in.model_validate(
                    {f: getattr(obj, f) for f in res.schema_in.model_fields}).model_dump(mode="json")
                provided = set(row.get("fields") or data.keys())
                current.update({k: v for k, v in data.items() if k in provided})
                payload = res.schema_in.model_validate(current).model_dump()
                save_record(db, res, obj, payload, admin)
                updated += 1
    except ValidationError as exc:
        db.rollback()
        raise HTTPException(422, f"Validation failed while applying import: {exc.errors()[0]['msg']}") from None
    except HTTPException:
        db.rollback()
        raise
    session.committed_at = utcnow()
    log_activity(db, admin=admin, action="IMPORT", module=res.key, record_label=session.filename,
                 details={"created": created, "updated": updated, "summary": session.summary}, request=request)
    db.commit()
    return {"created": created, "updated": updated}


@router.get("/{entity}/export")
def export(
    entity: str,
    request: Request,
    q: str | None = Query(None, max_length=100),
    status: str | None = Query("ALL"),
    db: Session = Depends(get_db),
    admin: M.Admin = Depends(require_admin),
):
    spec = X.get_spec(entity)
    res = spec.resource
    stmt = admin_list_query(res, request.query_params, q, status)
    objs = db.scalars(stmt.limit(50000)).unique().all()
    filters = {k: v for k, v in request.query_params.items() if v}
    log_activity(db, admin=admin, action="EXPORT", module=res.key, record_label=f"{entity}.xlsx",
                 details={"filters": filters, "rows": len(objs)}, request=request)
    db.commit()
    return _xlsx(X.build_export(spec, list(objs)), f"{entity}_{utcnow():%Y%m%d}.xlsx")
