"""Excel templates, two-phase import (preview -> confirm) and filtered export."""
import datetime as dt
import io
import math
import typing
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any

import pandas as pd
from fastapi import HTTPException
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from pydantic import ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session, object_session

from app import models as M
from app.crud.resource import Resource
from app.resources import BY_KEY

MAX_ROWS = 5000


@dataclass(frozen=True)
class Col:
    header: str
    field: str
    kind: str = "str"  # str | int | float | bool | date | datetime | list | faculty | student
    note: str = ""


@dataclass
class ExcelSpec:
    entity: str
    resource_key: str
    columns: list[Col]
    key: Callable[[dict], tuple | None]  # natural key from validated data
    title: str = ""

    @property
    def resource(self) -> Resource:
        return BY_KEY[self.resource_key]


def _k(*fields: str) -> Callable[[dict], tuple | None]:
    def key(data: dict) -> tuple | None:
        values = tuple(_norm(data.get(f)) for f in fields)
        return None if any(v in (None, "") for v in values) else values
    return key


def _norm(v: Any) -> Any:
    if isinstance(v, str):
        return " ".join(v.split()).lower()
    if isinstance(v, (dt.date, dt.datetime)):
        return v.isoformat()
    return v


def _publication_key(data: dict) -> tuple | None:
    if data.get("doi"):
        return ("doi", _norm(data["doi"]))
    return ("title", _norm(data.get("title")), data.get("year"))


def _faculty_key(data: dict) -> tuple | None:
    return ("email", _norm(data["email"])) if data.get("email") else ("name", _norm(data.get("name")))


STATUS_COL = Col("Status", "status", note="DRAFT, PUBLISHED or ARCHIVED. Blank = value chosen at import.")

SPECS: dict[str, ExcelSpec] = {s.entity: s for s in [
    ExcelSpec("students", "students", [
        Col("Name", "name"), Col("Register No", "register_no"), Col("Batch", "batch", note="e.g. 2023-2027"),
        Col("Year", "academic_year"), Col("Section", "section"),
        Col("Skills", "skills", "list"), Col("Areas of Interest", "interests", "list"),
        Col("Projects", "projects_summary"), Col("Achievements", "achievements_summary"),
        Col("Certifications", "certifications"), Col("Email", "email"), Col("Phone", "phone"),
        Col("LinkedIn URL", "linkedin_url"), Col("GitHub URL", "github_url"), Col("Photo URL", "photo_url"),
        Col("Show Photo", "show_photo", "bool"), Col("Show Contact", "show_contact", "bool"),
        Col("Show Register No", "show_register_no", "bool"),
    ], key=_k("register_no")),
    ExcelSpec("faculty", "faculty", [
        Col("Name", "name"), Col("Designation", "designation"), Col("Qualification", "qualification"),
        Col("Specialization", "specialization"), Col("Experience (years)", "experience_years", "int"),
        Col("Email", "email"), Col("Show Email", "show_email", "bool"), Col("Photo URL", "photo_url"),
        Col("Bio", "bio"), Col("Research Interests", "research_interests", "list"),
        Col("Publications", "publications_summary"), Col("Patents", "patents_summary"),
        Col("Certifications", "certifications"), Col("Workshops / Conferences", "workshops"),
        Col("FDPs", "fdps"), Col("Awards", "awards"), Col("Projects Guided", "projects_guided"),
        Col("Google Scholar URL", "google_scholar_url"), Col("ORCID URL", "orcid_url"),
        Col("LinkedIn URL", "linkedin_url"), Col("Display Order", "display_order", "int"),
    ], key=_faculty_key),
    ExcelSpec("student_achievements", "student-achievements", [
        Col("Participants", "participants", note="Student name or team members"),
        Col("Student Register No", "student_id", "student", note="Optional link to a student record"),
        Col("Team Name", "team_name"), Col("Batch", "batch"), Col("Title", "title"),
        Col("Event", "event_name"), Col("Organizer", "organizer"), Col("Position / Prize", "position"),
        Col("Date", "date", "date"), Col("Year", "year", "int"), Col("Category", "category"),
        Col("Level", "level"), Col("Description", "description"), Col("Certificate URL", "certificate_url"),
        Col("Image URL", "image_url"), Col("External Link", "external_url"),
    ], key=_k("title", "event_name", "year", "participants")),
    ExcelSpec("faculty_achievements", "faculty-achievements", [
        Col("Faculty Email", "faculty_id", "faculty", note="Email (or exact name) of an existing faculty"),
        Col("Title", "title"), Col("Category", "category"), Col("Description", "description"),
        Col("Date", "date", "date"), Col("Year", "year", "int"), Col("Organization", "organization"),
        Col("Level", "level"), Col("Research Domain", "research_domain"), Col("Image URL", "image_url"),
        Col("Document URL", "document_url"), Col("External Link", "external_url"),
    ], key=_k("faculty_id", "title", "year")),
    ExcelSpec("events", "events", [
        Col("Title", "title"), Col("Type", "event_type"), Col("Start", "start_at", "datetime"),
        Col("End", "end_at", "datetime"), Col("Venue", "venue"), Col("Speaker", "speaker"),
        Col("Organizer", "organizer"), Col("Description", "description"),
        Col("Registration URL", "registration_url"), Col("Contact", "contact_info"),
        Col("Event Status", "event_status"), Col("Poster URL", "poster_url"),
    ], key=_k("title", "start_at")),
    ExcelSpec("opportunities", "opportunities", [
        Col("Title", "title"), Col("Organizer", "organizer"), Col("Institution", "institution"),
        Col("City", "city"), Col("State", "state"), Col("Country", "country"), Col("Mode", "mode"),
        Col("Category", "category"), Col("Start Date", "start_date", "date"), Col("End Date", "end_date", "date"),
        Col("Registration Deadline", "registration_deadline", "date"), Col("Eligibility", "eligibility"),
        Col("Team Size", "team_size"), Col("Description", "description"), Col("Prizes", "prize_info"),
        Col("Registration URL", "registration_url"), Col("Website URL", "website_url"),
        Col("Source URL", "source_url"), Col("Last Verified", "last_verified_at", "date"),
        Col("Contact", "contact_info"),
    ], key=_k("title", "organizer", "start_date")),
    ExcelSpec("placements", "placements", [
        Col("Academic Year", "academic_year", note="e.g. 2025-26"), Col("Student Name", "student_name"),
        Col("Student Register No", "student_id", "student"), Col("Company", "company"), Col("Role", "role"),
        Col("Package (LPA)", "package_lpa", "float"), Col("Offer Type", "offer_type"),
    ], key=_k("academic_year", "student_name", "company")),
    ExcelSpec("publications", "publications", [
        Col("Title", "title"), Col("Authors", "authors"),
        Col("Faculty Email", "faculty_id", "faculty", note="Optional link to a faculty member"),
        Col("Student Publication", "is_student_publication", "bool"), Col("Type", "pub_type"),
        Col("Venue", "venue"), Col("Year", "year", "int"), Col("DOI", "doi"), Col("URL", "url"),
        Col("Domain", "domain"), Col("Indexing", "indexing"),
    ], key=_publication_key),
    ExcelSpec("projects", "projects", [
        Col("Title", "title"), Col("Description", "description"), Col("Students", "students"),
        Col("Guide Email", "guide_faculty_id", "faculty"), Col("Domain", "domain"),
        Col("Technologies", "technologies", "list"), Col("Academic Year", "academic_year"),
        Col("GitHub URL", "github_url"), Col("Demo URL", "demo_url"), Col("Publication", "publication"),
    ], key=_k("title", "academic_year")),
    ExcelSpec("alumni", "alumni", [
        Col("Name", "name"), Col("Batch", "batch"), Col("Graduation Year", "graduation_year", "int"),
        Col("Organization", "organization"), Col("Designation", "designation"),
        Col("Higher Studies", "higher_studies"), Col("Achievements", "achievements"),
        Col("Testimonial", "testimonial"), Col("Alumni Events", "events_participated"),
        Col("LinkedIn URL", "linkedin_url"), Col("Photo URL", "photo_url"),
    ], key=_k("name", "graduation_year")),
]}


def get_spec(entity: str) -> ExcelSpec:
    spec = SPECS.get(entity)
    if spec is None:
        raise HTTPException(404, "Unknown Excel entity")
    return spec


def all_columns(spec: ExcelSpec) -> list[Col]:
    return [*spec.columns, STATUS_COL]


# ------------------------------------------------------------------ lookups
class Lookups:
    """Resolve human identifiers in sheets (faculty email/name, student register no) to ids."""

    def __init__(self, db: Session):
        self.db = db
        self._faculty: dict[str, int] | None = None
        self._students: dict[str, int] | None = None

    def faculty(self) -> dict[str, int]:
        if self._faculty is None:
            self._faculty = {}
            for fid, email, name in self.db.execute(select(M.Faculty.id, M.Faculty.email, M.Faculty.name)):
                self._faculty.setdefault(_norm(name), fid)
                if email:
                    self._faculty[_norm(email)] = fid
        return self._faculty

    def students(self) -> dict[str, int]:
        if self._students is None:
            self._students = {_norm(r): i for i, r in self.db.execute(select(M.Student.id, M.Student.register_no))}
        return self._students


def _allowed_values(schema, field_name: str) -> list[str]:
    info = schema.model_fields.get(field_name)
    if info is None:
        return []
    ann = info.annotation
    for arg in (typing.get_args(ann) or (ann,)):
        if typing.get_origin(arg) is typing.Literal:
            return list(typing.get_args(arg))
    if typing.get_origin(ann) is typing.Literal:
        return list(typing.get_args(ann))
    return []


def _is_blank(v: Any) -> bool:
    return v is None or (isinstance(v, float) and math.isnan(v)) or (isinstance(v, str) and not v.strip()) \
        or v is pd.NaT


def _cell_to_value(v: Any, col: Col, lookups: Lookups) -> Any:
    if _is_blank(v):
        return None
    if isinstance(v, pd.Timestamp):
        v = v.to_pydatetime()
    if col.kind == "date":
        return v.date().isoformat() if isinstance(v, dt.datetime) else (v.isoformat() if isinstance(v, dt.date) else str(v).strip())
    if col.kind == "datetime":
        return v.isoformat() if isinstance(v, (dt.datetime, dt.date)) else str(v).strip()
    if col.kind in ("int", "float"):
        return v if isinstance(v, (int, float)) else str(v).strip()
    if col.kind == "bool":
        return v if isinstance(v, bool) else str(v).strip().lower()
    if isinstance(v, float) and v.is_integer():
        v = int(v)  # e.g. register numbers that Excel stored as numbers
    text = str(v).strip()
    if col.kind == "faculty":
        fid = lookups.faculty().get(_norm(text))
        if fid is None:
            raise ValueError(f"{col.header}: no faculty member found for '{text}'")
        return fid
    if col.kind == "student":
        sid = lookups.students().get(_norm(text))
        if sid is None:
            raise ValueError(f"{col.header}: no student found with register no '{text}'")
        return sid
    return text


# ------------------------------------------------------------------ template & export
HEADER_FILL = PatternFill("solid", fgColor="1F3A5F")


def _write_sheet(ws, headers: list[str], rows: list[list[Any]]) -> None:
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True, color="FFFFFF")
        cell.fill = HEADER_FILL
        cell.alignment = Alignment(vertical="center")
    for r_idx, row in enumerate(rows, start=2):
        for c_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=value)
            if isinstance(value, str) and value[:1] in ("=", "+", "-", "@"):
                cell.data_type = "s"  # never let exported text become a formula
    for idx, header in enumerate(headers, start=1):
        width = max([len(header)] + [len(str(r[idx - 1])) for r in rows[:200] if r[idx - 1] is not None])
        ws.column_dimensions[get_column_letter(idx)].width = min(max(12, width + 2), 60)
    ws.freeze_panes = "A2"


def _to_bytes(wb: Workbook) -> bytes:
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def build_template(spec: ExcelSpec) -> bytes:
    cols = all_columns(spec)
    wb = Workbook()
    ws = wb.active
    ws.title = spec.entity[:31]
    _write_sheet(ws, [c.header for c in cols], [])
    info = wb.create_sheet("Instructions")
    schema = spec.resource.schema_in
    rows = []
    for c in cols:
        required = schema.model_fields.get(c.field) is not None and schema.model_fields[c.field].is_required()
        fmt = {"date": "YYYY-MM-DD", "datetime": "YYYY-MM-DD HH:MM", "list": "Comma-separated values",
               "bool": "Yes / No", "int": "Whole number", "float": "Number"}.get(c.kind, "Text")
        allowed = ", ".join(_allowed_values(schema, c.field))
        rows.append([c.header, "Yes" if required else "No", fmt, allowed, c.note])
    _write_sheet(info, ["Column", "Required", "Format", "Allowed values", "Notes"], rows)
    return _to_bytes(wb)


def _export_value(obj: Any, col: Col) -> Any:
    value = getattr(obj, col.field, None)
    if value is None:
        return None
    if col.kind == "faculty":
        rel = next((r for r in ("faculty", "guide_faculty", "pi_faculty") if hasattr(obj, r)), None)
        f = getattr(obj, rel, None) if rel else None
        return (f.email or f.name) if f else None
    if col.kind == "student":
        s = getattr(obj, "student", None) or object_session(obj).get(M.Student, value)
        return s.register_no if s else None
    if col.kind == "list":
        return ", ".join(value)
    if col.kind == "bool":
        return "Yes" if value else "No"
    if col.kind == "datetime" and isinstance(value, dt.datetime):
        return value.strftime("%Y-%m-%d %H:%M")
    return value


def build_export(spec: ExcelSpec, objs: list) -> bytes:
    cols = all_columns(spec)
    wb = Workbook()
    ws = wb.active
    ws.title = spec.entity[:31]
    _write_sheet(ws, [c.header for c in cols], [[_export_value(o, c) for c in cols] for o in objs])
    return _to_bytes(wb)


# ------------------------------------------------------------------ import preview
def _read_sheet(content: bytes) -> pd.DataFrame:
    if not content.startswith(b"PK"):
        raise HTTPException(400, "The file is not a valid .xlsx workbook.")
    try:
        df = pd.read_excel(io.BytesIO(content), sheet_name=0, dtype=object, engine="openpyxl")
    except Exception:
        raise HTTPException(400, "The workbook could not be read. Please use the provided template.") from None
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")
    if len(df) > MAX_ROWS:
        raise HTTPException(400, f"Too many rows (max {MAX_ROWS} per import).")
    return df


@dataclass
class PreviewRow:
    row: int
    action: str  # new | update | unchanged | invalid | duplicate
    label: str = ""
    data: dict = field(default_factory=dict)
    record_id: int | None = None
    errors: list[str] = field(default_factory=list)
    changes: list[str] = field(default_factory=list)
    fields: list[str] = field(default_factory=list)  # columns present in the sheet


def _comparable(v: Any) -> Any:
    if isinstance(v, dt.datetime):
        return v.replace(tzinfo=None, microsecond=0)
    if isinstance(v, str):
        return v.strip()
    return v


def build_preview(db: Session, spec: ExcelSpec, content: bytes) -> tuple[list[PreviewRow], list[str]]:
    res = spec.resource
    df = _read_sheet(content)
    cols = all_columns(spec)
    lower_headers = {h.lower(): h for h in df.columns}
    missing = [c.header for c in cols
               if c.header.lower() not in lower_headers
               and res.schema_in.model_fields.get(c.field) is not None
               and res.schema_in.model_fields[c.field].is_required()
               and not (c.field == "year" and "date" in lower_headers)]  # year is derived from date
    if missing:
        raise HTTPException(400, f"Missing required column(s): {', '.join(missing)}. Download the template.")
    known = {c.header.lower() for c in cols}
    warnings = [f"Ignored unknown column '{h}'" for h in df.columns if h.lower() not in known]

    # Index existing records by natural key
    existing: dict[tuple, Any] = {}
    for obj in db.scalars(select(res.model)).unique():
        data = {c.field: getattr(obj, c.field, None) for c in spec.columns}
        k = spec.key(data)
        if k is not None:
            existing.setdefault(k, obj)

    lookups = Lookups(db)
    seen: dict[tuple, int] = {}
    rows: list[PreviewRow] = []
    for idx, (_, series) in enumerate(df.iterrows(), start=2):  # row 1 = headers
        raw: dict[str, Any] = {}
        errors: list[str] = []
        for c in cols:
            header = lower_headers.get(c.header.lower())
            if header is None:
                continue
            try:
                raw[c.field] = _cell_to_value(series[header], c, lookups)
            except ValueError as exc:
                errors.append(str(exc))
        explicit_status = raw.pop("status", None)
        if explicit_status:
            raw["status"] = str(explicit_status).upper()
        label = str(raw.get(res.title_field) or raw.get("name") or raw.get("title") or f"Row {idx}")
        if errors:
            rows.append(PreviewRow(idx, "invalid", label, errors=errors))
            continue
        try:
            validated = res.schema_in.model_validate(raw)
        except ValidationError as exc:
            msgs = []
            for e in exc.errors():
                loc = e["loc"][0] if e["loc"] else None
                header = next((c.header for c in cols if c.field == loc), loc)
                msgs.append(f"{header}: {e['msg']}" if header else e["msg"])
            rows.append(PreviewRow(idx, "invalid", label, errors=msgs))
            continue
        data = validated.model_dump()
        key = spec.key(data)
        if key is not None and key in seen:
            rows.append(PreviewRow(idx, "duplicate", label, errors=[f"Same record as row {seen[key]}"]))
            continue
        if key is not None:
            seen[key] = idx
        store = validated.model_dump(mode="json")
        if not explicit_status:
            store.pop("status", None)
        match = existing.get(key) if key is not None else None
        if match is None:
            rows.append(PreviewRow(idx, "new", label, data=store))
            continue
        provided = set(raw.keys())
        changes = [c.header for c in cols if c.field in provided and c.field in data
                   and _comparable(getattr(match, c.field)) != _comparable(data[c.field])]
        action = "update" if changes else "unchanged"
        rows.append(PreviewRow(idx, action, label, data=store, record_id=match.id, changes=changes,
                               fields=sorted(provided)))
    return rows, warnings


def summarize(rows: list[PreviewRow]) -> dict[str, int]:
    out = {"new": 0, "update": 0, "unchanged": 0, "invalid": 0, "duplicate": 0, "total": len(rows)}
    for r in rows:
        out[r.action] += 1
    return out

