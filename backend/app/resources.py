"""Declarations of every content module served by the generic resource framework."""
from datetime import date, datetime, timedelta

from sqlalchemy import func, or_

from app import models as M
from app.crud.resource import Filter, Resource
from app.schemas import modules as S
from app.schemas.options import EVENT_GROUPS, STUDENT_ACHIEVEMENT_GROUPS


# ------------------------------------------------------------ custom filters
def _events_when(stmt, value: str):
    now = datetime.now()
    if value == "upcoming":
        return stmt.where(M.Event.start_at >= now - timedelta(hours=12),
                          M.Event.event_status != "CANCELLED").order_by(M.Event.start_at.asc())
    if value == "past":
        return stmt.where(M.Event.start_at < now)
    return stmt


def _events_group(stmt, value: str):
    types = EVENT_GROUPS.get(value)
    return stmt.where(M.Event.event_type.in_(types)) if types else stmt.where(False)


def _student_achievement_group(stmt, value: str):
    categories = STUDENT_ACHIEVEMENT_GROUPS.get(value)
    return stmt.where(M.StudentAchievement.category.in_(categories)) if categories else stmt.where(False)


def _opportunity_cutoff():
    return func.coalesce(M.Opportunity.registration_deadline, M.Opportunity.start_date)


def _opportunity_registration(stmt, value: str):
    today = date.today()
    cutoff = _opportunity_cutoff()
    if value == "OPEN":
        return stmt.where(or_(cutoff.is_(None), cutoff >= today))
    if value == "CLOSING_SOON":
        return stmt.where(cutoff >= today, cutoff <= today + timedelta(days=7))
    if value == "CLOSED":
        return stmt.where(cutoff < today)
    return stmt


def _opportunity_month(stmt, value: str):
    # value "YYYY-MM": the opportunity takes place (at least partly) in that month
    try:
        start = date.fromisoformat(f"{value}-01")
    except ValueError:
        return stmt.where(False)
    end = (start.replace(day=28) + timedelta(days=4)).replace(day=1)
    event_end = func.coalesce(M.Opportunity.end_date, M.Opportunity.start_date)
    return stmt.where(M.Opportunity.start_date < end, event_end >= start)


def _internship_open(stmt, value: bool):
    today = date.today()
    cond = or_(M.Internship.deadline.is_(None), M.Internship.deadline >= today)
    return stmt.where(cond) if value else stmt.where(~cond)


def _news_year(stmt, value: int):
    return stmt.where(M.News.published_on >= date(value, 1, 1), M.News.published_on < date(value + 1, 1, 1))


# ------------------------------------------------------------ resources
RESOURCES: list[Resource] = [
    Resource(
        key="highlights", label="Highlights", model=M.Highlight,
        schema_in=S.HighlightIn, schema_read=S.HighlightRead,
        search_fields=("title", "description"),
        order_by=lambda m: [m.display_order, m.id.desc()],
        default_page_size=20,
    ),
    Resource(
        key="mous", label="MOUs", model=M.Mou,
        schema_in=S.MouIn, schema_read=S.MouRead, title_field="organization",
        search_fields=("organization", "purpose"),
        order_by=lambda m: [m.display_order, m.signed_on.desc().nulls_last(), m.id.desc()],
        default_page_size=50,
    ),
    Resource(
        key="faculty", label="Faculty", model=M.Faculty,
        schema_in=S.FacultyIn, schema_read=S.FacultyRead,
        schema_public=S.FacultyPublic, schema_public_list=S.FacultyListItem,
        title_field="name", slug_source="name",
        search_fields=("name", "designation", "specialization", "qualification", "research_interests"),
        filters=(Filter("designation"),),
        facets=("designation",),
        order_by=lambda m: [m.display_order, m.name],
        default_page_size=24,
    ),
    Resource(
        key="students", label="Students", model=M.Student,
        schema_in=S.StudentIn, schema_read=S.StudentRead, schema_public=S.StudentPublic,
        title_field="name",
        # register_no / email are deliberately not publicly searchable (privacy)
        search_fields=("name", "skills", "interests"),
        admin_search_fields=("register_no", "email"),
        filters=(
            Filter("batch"), Filter("academic_year"), Filter("section"),
            Filter("skill", "skills", "json_has"), Filter("interest", "interests", "json_has"),
            Filter("register_no", op="ilike", admin_only=True),
        ),
        facets=("batch", "academic_year", "section", "skills", "interests"),
        order_by=lambda m: [m.batch.desc(), m.section, m.name],
        default_page_size=24,
    ),
    Resource(
        key="faculty-achievements", label="Faculty Achievements", model=M.FacultyAchievement,
        schema_in=S.FacultyAchievementIn, schema_read=S.FacultyAchievementRead,
        search_fields=("title", "description", "organization", "research_domain"),
        filters=(
            Filter("year", type=int), Filter("faculty_id", type=int), Filter("category"),
            Filter("level"), Filter("domain", "research_domain", "ilike"),
        ),
        facets=("year", "category", "research_domain"),
        order_by=lambda m: [m.year.desc(), m.date.desc().nulls_last(), m.id.desc()],
        fk_checks={"faculty_id": M.Faculty},
    ),
    Resource(
        key="student-achievements", label="Student Achievements", model=M.StudentAchievement,
        schema_in=S.StudentAchievementIn, schema_read=S.StudentAchievementRead,
        search_fields=("title", "participants", "team_name", "event_name", "organizer", "description"),
        filters=(
            Filter("year", type=int), Filter("category"), Filter("level"), Filter("batch"),
            Filter("student", "participants", "ilike"), Filter("student_id", type=int),
            Filter("group", op="custom", apply=_student_achievement_group),
        ),
        facets=("year", "category", "level", "batch"),
        order_by=lambda m: [m.year.desc(), m.date.desc().nulls_last(), m.id.desc()],
        fk_checks={"student_id": M.Student},
    ),
    Resource(
        key="events", label="Events", model=M.Event,
        schema_in=S.EventIn, schema_read=S.EventRead, slug_source="title",
        search_fields=("title", "speaker", "organizer", "venue", "description"),
        filters=(
            Filter("event_type"), Filter("event_status"),
            Filter("when", op="custom", apply=_events_when),
            Filter("group", op="custom", apply=_events_group),
            Filter("from", "start_at", "gte", date), Filter("to", "start_at", "lte", date),
        ),
        facets=("event_type", "event_status"),
        order_by=lambda m: [m.start_at.desc()],
    ),
    Resource(
        key="opportunities", label="Opportunities", model=M.Opportunity,
        schema_in=S.OpportunityIn, schema_read=S.OpportunityRead,
        search_fields=("title", "organizer", "institution", "city", "state", "description", "eligibility"),
        filters=(
            Filter("category"), Filter("state"), Filter("city", op="ilike"), Filter("mode"),
            Filter("organizer", op="ilike"), Filter("eligibility", op="ilike"),
            Filter("registration", op="custom", apply=_opportunity_registration),
            Filter("month", op="custom", apply=_opportunity_month),
            Filter("from", "start_date", "gte", date), Filter("to", "start_date", "lte", date),
        ),
        facets=("category", "state", "city", "mode"),
        order_by=lambda m: [_opportunity_cutoff().asc().nulls_last(), m.id.desc()],
    ),
    Resource(
        key="placement-years", label="Placement Statistics", model=M.PlacementYear,
        schema_in=S.PlacementYearIn, schema_read=S.PlacementYearRead, schema_public=S.PlacementYearPublic,
        title_field="academic_year",
        search_fields=("academic_year",),
        order_by=lambda m: [m.academic_year.desc()],
        default_page_size=50,
    ),
    Resource(
        key="placements", label="Placements", model=M.Placement,
        schema_in=S.PlacementIn, schema_read=S.PlacementRead, title_field="student_name",
        search_fields=("student_name", "company", "role"),
        filters=(Filter("academic_year"), Filter("company", op="ilike")),
        facets=("academic_year", "company"),
        order_by=lambda m: [m.academic_year.desc(), m.package_lpa.desc().nulls_last(), m.student_name],
        fk_checks={"student_id": M.Student},
        default_page_size=24,
    ),
    Resource(
        key="recruiters", label="Recruiters", model=M.Recruiter,
        schema_in=S.RecruiterIn, schema_read=S.RecruiterRead, title_field="name",
        search_fields=("name",),
        order_by=lambda m: [m.display_order, m.name],
        default_page_size=100,
    ),
    Resource(
        key="internships", label="Internships", model=M.Internship,
        schema_in=S.InternshipIn, schema_read=S.InternshipRead, title_field="company",
        search_fields=("company", "role", "location", "student_name", "description"),
        filters=(
            Filter("kind"), Filter("mode"), Filter("company", op="ilike"), Filter("academic_year"),
            Filter("open", op="custom", type=bool, apply=_internship_open),
        ),
        facets=("kind", "mode", "academic_year"),
        order_by=lambda m: [m.deadline.desc().nulls_last(), m.id.desc()],
    ),
    Resource(
        key="publications", label="Publications", model=M.Publication,
        schema_in=S.PublicationIn, schema_read=S.PublicationRead,
        search_fields=("title", "authors", "venue", "domain", "doi"),
        filters=(
            Filter("year", type=int), Filter("faculty_id", type=int), Filter("domain", op="ilike"),
            Filter("pub_type"), Filter("student", "is_student_publication", type=bool),
        ),
        facets=("year", "pub_type", "domain", "indexing"),
        order_by=lambda m: [m.year.desc(), m.id.desc()],
        fk_checks={"faculty_id": M.Faculty},
        default_page_size=20,
    ),
    Resource(
        key="patents", label="Patents", model=M.Patent,
        schema_in=S.PatentIn, schema_read=S.PatentRead,
        search_fields=("title", "inventors", "domain", "application_no", "patent_no"),
        filters=(Filter("year", type=int), Filter("faculty_id", type=int), Filter("patent_status"),
                 Filter("domain", op="ilike")),
        facets=("year", "patent_status", "domain"),
        order_by=lambda m: [m.year.desc(), m.id.desc()],
        fk_checks={"faculty_id": M.Faculty},
        default_page_size=20,
    ),
    Resource(
        key="research-projects", label="Research Projects", model=M.ResearchProject,
        schema_in=S.ResearchProjectIn, schema_read=S.ResearchProjectRead,
        search_fields=("title", "investigators", "funding_agency", "domain", "collaboration_partner"),
        filters=(
            Filter("year", type=int), Filter("project_status"), Filter("domain", op="ilike"),
            Filter("faculty_id", "pi_faculty_id", type=int),
            Filter("industry", "is_industry_collaboration", type=bool),
        ),
        facets=("year", "project_status", "domain"),
        order_by=lambda m: [m.year.desc(), m.id.desc()],
        fk_checks={"pi_faculty_id": M.Faculty},
        default_page_size=20,
    ),
    Resource(
        key="laboratories", label="Laboratories", model=M.Laboratory,
        schema_in=S.LaboratoryIn, schema_read=S.LaboratoryRead,
        title_field="name", slug_source="name",
        search_fields=("name", "description", "equipment", "software", "courses"),
        filters=(Filter("research", "is_research_lab", type=bool),),
        order_by=lambda m: [m.display_order, m.name],
        fk_checks={"incharge_faculty_id": M.Faculty},
        default_page_size=50,
    ),
    Resource(
        key="projects", label="Projects", model=M.Project,
        schema_in=S.ProjectIn, schema_read=S.ProjectRead,
        search_fields=("title", "description", "students", "domain", "technologies"),
        filters=(
            Filter("academic_year"), Filter("domain"), Filter("technology", "technologies", "json_has"),
            Filter("faculty_id", "guide_faculty_id", type=int), Filter("featured", "is_featured", type=bool),
        ),
        facets=("academic_year", "domain", "technologies"),
        order_by=lambda m: [m.academic_year.desc(), m.is_featured.desc(), m.id.desc()],
        fk_checks={"guide_faculty_id": M.Faculty},
    ),
    Resource(
        key="alumni", label="Alumni", model=M.Alumnus,
        schema_in=S.AlumnusIn, schema_read=S.AlumnusRead, title_field="name",
        search_fields=("name", "organization", "designation", "higher_studies"),
        filters=(Filter("graduation_year", type=int), Filter("organization", op="ilike")),
        facets=("graduation_year",),
        order_by=lambda m: [m.graduation_year.desc(), m.name],
        default_page_size=24,
    ),
    Resource(
        key="news", label="News", model=M.News,
        schema_in=S.NewsIn, schema_read=S.NewsRead, schema_public_list=S.NewsListItem,
        slug_source="title",
        search_fields=("title", "summary", "content", "author"),
        filters=(Filter("category"), Filter("year", op="custom", type=int, apply=_news_year),
                 Filter("featured", "is_featured", type=bool)),
        facets=("category",),
        order_by=lambda m: [m.published_on.desc(), m.id.desc()],
    ),
    Resource(
        key="gallery", label="Gallery", model=M.GalleryAlbum,
        schema_in=S.GalleryAlbumIn, schema_read=S.GalleryAlbumRead,
        schema_public_list=S.GalleryAlbumListItem,
        slug_source="title",
        search_fields=("title", "description"),
        filters=(Filter("category"),),
        facets=("category",),
        order_by=lambda m: [m.event_date.desc().nulls_last(), m.id.desc()],
    ),
    Resource(
        key="videos", label="Videos", model=M.Video,
        schema_in=S.VideoIn, schema_read=S.VideoRead,
        search_fields=("title", "description"),
        filters=(Filter("category"),),
        facets=("category",),
        order_by=lambda m: [m.event_date.desc().nulls_last(), m.id.desc()],
    ),
    Resource(
        key="programs", label="Programs", model=M.Program,
        schema_in=S.ProgramIn, schema_read=S.ProgramRead, title_field="name",
        search_fields=("name", "description"),
        filters=(Filter("level"),),
        order_by=lambda m: [m.display_order, m.name],
        default_page_size=50,
    ),
    Resource(
        key="academic-documents", label="Academic Documents", model=M.AcademicDocument,
        schema_in=S.AcademicDocumentIn, schema_read=S.AcademicDocumentRead,
        search_fields=("title", "program", "regulation", "description"),
        filters=(Filter("category"), Filter("academic_year"), Filter("program", op="ilike")),
        facets=("category", "academic_year"),
        order_by=lambda m: [m.display_order, m.academic_year.desc().nulls_last(), m.id.desc()],
        default_page_size=100,
    ),
]

BY_KEY: dict[str, Resource] = {r.key: r for r in RESOURCES}
