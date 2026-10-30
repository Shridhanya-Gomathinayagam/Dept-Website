"""Public aggregate endpoints: home page, statistics, global search, summaries, options."""
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app import models as M
from app.api.v1.department import get_department
from app.crud.resource import PUBLISHED, apply_search
from app.db.session import get_db
from app.resources import BY_KEY
from app.schemas import modules as S
from app.schemas.common import FacultyRef
from app.schemas.options import ALL_OPTIONS

router = APIRouter(tags=["Site"])


def _count(db: Session, model) -> int:
    return db.scalar(select(func.count()).select_from(model).where(model.status == PUBLISHED)) or 0


def public_stats(db: Session) -> dict:
    placed_by_year = db.scalar(select(func.coalesce(func.sum(M.PlacementYear.students_placed), 0))
                               .where(M.PlacementYear.status == PUBLISHED)) or 0
    offers = _count(db, M.Placement)
    return {
        "faculty": _count(db, M.Faculty),
        "students": _count(db, M.Student),
        "publications": _count(db, M.Publication),
        "patents": _count(db, M.Patent),
        "placements": max(int(placed_by_year), offers),
        "achievements": _count(db, M.FacultyAchievement) + _count(db, M.StudentAchievement),
        "projects": _count(db, M.Project),
        "alumni": _count(db, M.Alumnus),
        "laboratories": _count(db, M.Laboratory),
    }


def _published(model):
    return select(model).where(model.status == PUBLISHED)


@router.get("/meta/options")
def options() -> dict:
    return {k: list(v) for k, v in ALL_OPTIONS.items()}


@router.get("/stats")
def stats(db: Session = Depends(get_db)) -> dict:
    return public_stats(db)


@router.get("/home")
def home(db: Session = Depends(get_db)) -> dict:
    dept = get_department(db)
    now = datetime.now()
    upcoming = db.scalars(
        _published(M.Event)
        .where(M.Event.start_at >= now - timedelta(hours=12), M.Event.event_status != "CANCELLED")
        .order_by(M.Event.is_featured.desc(), M.Event.start_at).limit(4)
    ).all()
    student_ach = db.scalars(
        _published(M.StudentAchievement)
        .order_by(M.StudentAchievement.year.desc(), M.StudentAchievement.date.desc().nulls_last(),
                  M.StudentAchievement.id.desc()).limit(6)
    ).unique().all()
    faculty_ach = db.scalars(
        _published(M.FacultyAchievement)
        .order_by(M.FacultyAchievement.year.desc(), M.FacultyAchievement.date.desc().nulls_last(),
                  M.FacultyAchievement.id.desc()).limit(4)
    ).unique().all()
    highlights = db.scalars(_published(M.Highlight).order_by(M.Highlight.display_order, M.Highlight.id.desc())
                            .limit(6)).all()
    news = db.scalars(_published(M.News).order_by(M.News.is_featured.desc(), M.News.published_on.desc())
                      .limit(3)).all()
    latest_year = db.scalars(_published(M.PlacementYear).order_by(M.PlacementYear.academic_year.desc())
                             .limit(1)).first()
    return {
        "department": S.DepartmentRead.model_validate(dept).model_dump(mode="json") if dept else None,
        "stats": public_stats(db),
        "upcoming_events": [S.EventRead.model_validate(e).model_dump(mode="json") for e in upcoming],
        "student_achievements": [S.StudentAchievementRead.model_validate(a).model_dump(mode="json")
                                 for a in student_ach],
        "faculty_achievements": [S.FacultyAchievementRead.model_validate(a).model_dump(mode="json")
                                 for a in faculty_ach],
        "highlights": [S.HighlightRead.model_validate(h).model_dump(mode="json") for h in highlights],
        "news": [S.NewsListItem.model_validate(n).model_dump(mode="json") for n in news],
        # Latest academic year's placement rate, for the home statistics ribbon (None if not computable).
        "placement_rate": S.PlacementYearRead.model_validate(latest_year).placement_percentage if latest_year else None,
    }


# key -> (subtitle builder)
SEARCH_GROUPS = {
    "faculty": lambda o: o.designation,
    "students": lambda o: f"Batch {o.batch}",
    "faculty-achievements": lambda o: f"{o.faculty.name if o.faculty else ''} · {o.category} · {o.year}",
    "student-achievements": lambda o: f"{o.participants} · {o.category} · {o.year}",
    "events": lambda o: f"{o.event_type} · {o.start_at:%d %b %Y}",
    "publications": lambda o: f"{o.authors} · {o.year}",
    "research-projects": lambda o: f"{o.project_status.title()} · {o.year}",
    "projects": lambda o: f"{o.academic_year} · {o.domain or ''}".strip(" ·"),
    "news": lambda o: f"{o.category} · {o.published_on:%d %b %Y}",
    "alumni": lambda o: " · ".join(x for x in (o.designation, o.organization, str(o.graduation_year)) if x),
}


@router.get("/search")
def search(q: str = Query(..., min_length=2, max_length=100), limit: int = Query(5, ge=1, le=20),
           db: Session = Depends(get_db)) -> dict:
    groups = []
    for key, subtitle in SEARCH_GROUPS.items():
        res = BY_KEY[key]
        stmt = apply_search(res.model, res.search_fields, _published(res.model), q)
        total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
        if not total:
            continue
        objs = db.scalars(stmt.order_by(*res.order_by(res.model)).limit(limit)).unique().all()
        groups.append({
            "key": key,
            "label": res.label,
            "total": total,
            "items": [{"id": o.id, "slug": getattr(o, "slug", None), "title": str(getattr(o, res.title_field)),
                       "subtitle": subtitle(o)} for o in objs],
        })
    return {"query": q, "groups": groups}


@router.get("/placements-summary")
def placements_summary(academic_year: str | None = Query(None, max_length=9), db: Session = Depends(get_db)) -> dict:
    years = db.scalars(_published(M.PlacementYear).order_by(M.PlacementYear.academic_year.desc())).all()
    company_q = (
        select(M.Placement.company, func.count(M.Placement.id), func.max(M.Placement.package_lpa))
        .where(M.Placement.status == PUBLISHED)
        .group_by(M.Placement.company)
        .order_by(func.count(M.Placement.id).desc(), M.Placement.company)
    )
    if academic_year:
        company_q = company_q.where(M.Placement.academic_year == academic_year)
    recruiters = db.scalars(_published(M.Recruiter).order_by(M.Recruiter.display_order, M.Recruiter.name)).all()
    return {
        "years": [S.PlacementYearPublic.model_validate(y).model_dump(mode="json") for y in years],
        "companies": [{"company": c, "offers": n, "highest_package_lpa": hp} for c, n, hp in db.execute(company_q)],
        "recruiters": [S.RecruiterRead.model_validate(r).model_dump(mode="json") for r in recruiters],
    }


@router.get("/research-summary")
def research_summary(db: Session = Depends(get_db)) -> dict:
    pub_types = dict(db.execute(
        select(M.Publication.pub_type, func.count()).where(M.Publication.status == PUBLISHED)
        .group_by(M.Publication.pub_type)).all())
    proj_status = dict(db.execute(
        select(M.ResearchProject.project_status, func.count()).where(M.ResearchProject.status == PUBLISHED)
        .group_by(M.ResearchProject.project_status)).all())
    domains: set[str] = set()
    for model in (M.Publication, M.ResearchProject, M.Patent):
        domains.update(d for d in db.scalars(select(model.domain).where(model.status == PUBLISHED,
                                                                         model.domain.is_not(None)).distinct()))
    labs = db.scalars(_published(M.Laboratory).where(M.Laboratory.is_research_lab.is_(True))
                      .order_by(M.Laboratory.display_order, M.Laboratory.name)).all()
    for lab in labs:
        domains.update(lab.research_domains or [])
    faculty = db.scalars(_published(M.Faculty).order_by(M.Faculty.display_order, M.Faculty.name)).all()
    return {
        "publications_by_type": pub_types,
        "publications": sum(pub_types.values()),
        "student_publications": db.scalar(select(func.count()).select_from(M.Publication).where(
            M.Publication.status == PUBLISHED, M.Publication.is_student_publication.is_(True))) or 0,
        "patents": _count(db, M.Patent),
        "projects_by_status": proj_status,
        "industry_collaborations": db.scalar(select(func.count()).select_from(M.ResearchProject).where(
            M.ResearchProject.status == PUBLISHED, M.ResearchProject.is_industry_collaboration.is_(True))) or 0,
        "domains": sorted(domains, key=str.lower),
        "research_labs": [S.LaboratoryRead.model_validate(lab).model_dump(mode="json") for lab in labs],
        "faculty": [FacultyRef.model_validate(f).model_dump() for f in faculty],
    }


@router.get("/faculty-options")
def faculty_options(db: Session = Depends(get_db)) -> list[dict]:
    """Published faculty names for public filter dropdowns."""
    rows = db.scalars(_published(M.Faculty).order_by(M.Faculty.display_order, M.Faculty.name)).all()
    return [FacultyRef.model_validate(f).model_dump() for f in rows]
