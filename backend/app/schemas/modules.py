"""Pydantic schemas for every content module.

Convention per module:
  XIn      — create/replace payload (admin forms, Excel import rows)
  XRead    — full admin representation
  XPublic  — public representation (only when it must differ from XRead)
  XListItem — lighter public list item (optional)
"""
import datetime as dt
from typing import Any

from pydantic import BaseModel, EmailStr, Field, computed_field, model_validator

from app.schemas import options as O
from app.schemas.common import (
    READ_CONFIG,
    S,
    AcademicYear,
    Batch,
    ContentIn,
    FacultyRef,
    InSchema,
    ReadMeta,
    Ref,
    StrList,
    Text,
    Url,
    Year,
    choice,
)


def _year_from_date(data: Any) -> Any:
    if isinstance(data, dict) and not data.get("year") and data.get("date"):
        d = data["date"]
        if isinstance(d, (dt.date, dt.datetime)):
            data["year"] = d.year
        elif isinstance(d, str) and len(d) >= 4 and d[:4].isdigit():
            data["year"] = int(d[:4])
    return data


# ---------------------------------------------------------------- Department
class LinkItem(InSchema):
    label: S(80)
    url: Url


class DepartmentIn(InSchema):
    name: S(200)
    short_name: S(50) | None = None
    college_name: S(250) | None = None
    college_logo_url: Url | None = None
    hero_image_url: Url | None = None
    tagline: S(300) | None = None
    intro: Text | None = None
    overview: Text | None = None
    vision: Text | None = None
    mission: StrList = []
    peos: StrList = []
    pos: StrList = []
    psos: StrList = []
    objectives: StrList = []
    year_established: Year | None = None
    accreditation: Text | None = None
    recognition: Text | None = None
    facilities: StrList = []
    hod_name: S(150) | None = None
    hod_designation: S(150) | None = None
    hod_photo_url: Url | None = None
    hod_message: Text | None = None
    address: Text | None = None
    college_address: Text | None = None
    email: EmailStr | None = None
    phone: S(50) | None = None
    map_embed_url: Url | None = None
    college_website: Url | None = None
    social_links: list[LinkItem] = Field(default=[], max_length=20)
    important_links: list[LinkItem] = Field(default=[], max_length=30)


class DepartmentRead(DepartmentIn):
    model_config = READ_CONFIG
    id: int
    updated_at: dt.datetime


class HighlightIn(ContentIn):
    title: S(200)
    description: Text | None = None
    image_url: Url | None = None
    link_url: Url | None = None
    display_order: int = Field(0, ge=0, le=10000)


class HighlightRead(ReadMeta, HighlightIn):
    model_config = READ_CONFIG


class MouIn(ContentIn):
    organization: S(250)
    logo_url: Url | None = None
    signed_on: dt.date | None = None
    valid_until: dt.date | None = None
    purpose: Text | None = None
    website_url: Url | None = None
    document_url: Url | None = None
    display_order: int = Field(100, ge=0, le=10000)

    @model_validator(mode="after")
    def _check_dates(self):
        if self.signed_on and self.valid_until and self.valid_until < self.signed_on:
            raise ValueError("Valid until cannot be before the signing date")
        return self


class MouRead(ReadMeta, MouIn):
    model_config = READ_CONFIG


# ---------------------------------------------------------------- Faculty
class FacultyIn(ContentIn):
    name: S(150)
    designation: S(150)
    qualification: S(250) | None = None
    specialization: S(250) | None = None
    experience_years: int | None = Field(None, ge=0, le=60)
    email: EmailStr | None = None
    show_email: bool = True
    photo_url: Url | None = None
    bio: Text | None = None
    research_interests: StrList = []
    publications_summary: Text | None = None
    patents_summary: Text | None = None
    certifications: Text | None = None
    workshops: Text | None = None
    fdps: Text | None = None
    awards: Text | None = None
    projects_guided: Text | None = None
    google_scholar_url: Url | None = None
    orcid_url: Url | None = None
    linkedin_url: Url | None = None
    display_order: int = Field(100, ge=0, le=10000)


class FacultyRead(ReadMeta, FacultyIn):
    model_config = READ_CONFIG
    slug: str


class FacultyPublic(FacultyRead):
    @model_validator(mode="after")
    def _hide_private(self):
        if not self.show_email:
            self.email = None
        return self


class FacultyListItem(BaseModel):
    model_config = READ_CONFIG
    id: int
    slug: str
    name: str
    designation: str
    qualification: str | None = None
    specialization: str | None = None
    photo_url: str | None = None
    research_interests: list[str] = []
    email: str | None = None
    linkedin_url: str | None = None
    google_scholar_url: str | None = None


# ---------------------------------------------------------------- Students
class StudentIn(ContentIn):
    name: S(150)
    register_no: S(50)
    batch: Batch
    academic_year: choice(O.STUDENT_YEARS) | None = None
    section: S(10) | None = None
    photo_url: Url | None = None
    skills: StrList = []
    interests: StrList = []
    projects_summary: Text | None = None
    achievements_summary: Text | None = None
    certifications: Text | None = None
    email: EmailStr | None = None
    phone: S(30) | None = None
    linkedin_url: Url | None = None
    github_url: Url | None = None
    show_photo: bool = False
    show_contact: bool = False
    show_register_no: bool = False


class StudentRead(ReadMeta, StudentIn):
    model_config = READ_CONFIG


class StudentPublic(BaseModel):
    """Only academic/public information; contact & identifiers honour privacy switches."""

    model_config = READ_CONFIG
    id: int
    name: str
    batch: str
    academic_year: str | None = None
    section: str | None = None
    skills: list[str] = []
    interests: list[str] = []
    projects_summary: str | None = None
    achievements_summary: str | None = None
    certifications: str | None = None
    photo_url: str | None = None
    register_no: str | None = None
    email: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None

    @model_validator(mode="before")
    @classmethod
    def _apply_privacy(cls, obj: Any) -> Any:
        get = obj.get if isinstance(obj, dict) else (lambda k, d=None: getattr(obj, k, d))
        data = {k: get(k) for k in cls.model_fields}
        if not get("show_photo"):
            data["photo_url"] = None
        if not get("show_register_no"):
            data["register_no"] = None
        if not get("show_contact"):
            data["email"] = data["linkedin_url"] = data["github_url"] = None
        return data


# ---------------------------------------------------------------- Achievements
class FacultyAchievementIn(ContentIn):
    faculty_id: int
    title: S(300)
    description: Text | None = None
    category: choice(O.FACULTY_ACHIEVEMENT_CATEGORIES)
    date: dt.date | None = None
    year: Year
    organization: S(250) | None = None
    level: choice(O.LEVELS) | None = None
    research_domain: S(150) | None = None
    image_url: Url | None = None
    document_url: Url | None = None
    external_url: Url | None = None

    @model_validator(mode="before")
    @classmethod
    def _derive_year(cls, data: Any) -> Any:
        return _year_from_date(data)


class FacultyAchievementRead(ReadMeta, FacultyAchievementIn):
    model_config = READ_CONFIG
    faculty: FacultyRef | None = None


class StudentAchievementIn(ContentIn):
    student_id: int | None = None
    participants: S(500)
    team_name: S(150) | None = None
    batch: Batch | None = None
    title: S(300)
    event_name: S(250) | None = None
    organizer: S(250) | None = None
    position: S(100) | None = None
    date: dt.date | None = None
    year: Year
    category: choice(O.STUDENT_ACHIEVEMENT_CATEGORIES)
    level: choice(O.LEVELS)
    description: Text | None = None
    image_url: Url | None = None
    certificate_url: Url | None = None
    external_url: Url | None = None

    @model_validator(mode="before")
    @classmethod
    def _derive_year(cls, data: Any) -> Any:
        return _year_from_date(data)


class StudentAchievementRead(ReadMeta, StudentAchievementIn):
    model_config = READ_CONFIG
    student: Ref | None = None


# ---------------------------------------------------------------- Events
class EventIn(ContentIn):
    title: S(250)
    event_type: choice(O.EVENT_TYPES)
    start_at: dt.datetime
    end_at: dt.datetime | None = None
    venue: S(250) | None = None
    speaker: S(250) | None = None
    organizer: S(250) | None = None
    description: Text | None = None
    poster_url: Url | None = None
    registration_url: Url | None = None
    contact_info: S(300) | None = None
    event_status: choice(O.EVENT_STATUSES) = "UPCOMING"
    is_featured: bool = False

    @model_validator(mode="after")
    def _check_dates(self):
        if self.end_at and self.end_at < self.start_at:
            raise ValueError("End time must be after start time")
        return self


class EventRead(ReadMeta, EventIn):
    model_config = READ_CONFIG
    slug: str


class OpportunityIn(ContentIn):
    title: S(250)
    organizer: S(250)
    institution: S(250) | None = None
    city: S(100) | None = None
    state: S(100) | None = None
    country: S(100) = "India"
    mode: choice(O.MODES)
    category: choice(O.OPPORTUNITY_CATEGORIES)
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    registration_deadline: dt.date | None = None
    eligibility: S(300) | None = None
    team_size: S(50) | None = None
    description: Text | None = None
    prize_info: S(500) | None = None
    registration_url: Url
    website_url: Url | None = None
    source_url: Url
    last_verified_at: dt.date
    poster_url: Url | None = None
    contact_info: S(300) | None = None

    @model_validator(mode="after")
    def _check_dates(self):
        if self.start_date and self.end_date and self.end_date < self.start_date:
            raise ValueError("End date must be on or after start date")
        return self


def registration_status(deadline: dt.date | None, start: dt.date | None, today: dt.date | None = None) -> str:
    today = today or dt.date.today()
    cutoff = deadline or start
    if cutoff is None:
        return "OPEN"
    if cutoff < today:
        return "CLOSED"
    return "CLOSING_SOON" if (cutoff - today).days <= 7 else "OPEN"


class OpportunityRead(ReadMeta, OpportunityIn):
    model_config = READ_CONFIG
    source: str

    @computed_field
    @property
    def registration_status(self) -> str:
        return registration_status(self.registration_deadline, self.start_date)


# ---------------------------------------------------------------- Placements & internships
class PlacementYearIn(ContentIn):
    academic_year: AcademicYear
    eligible_students: int | None = Field(None, ge=0)
    students_placed: int | None = Field(None, ge=0)
    highest_package_lpa: float | None = Field(None, ge=0, le=1000)
    average_package_lpa: float | None = Field(None, ge=0, le=1000)
    publish_average: bool = False
    companies_visited: int | None = Field(None, ge=0)
    summary: Text | None = None

    @model_validator(mode="after")
    def _check_counts(self):
        if self.eligible_students is not None and self.students_placed is not None \
                and self.students_placed > self.eligible_students:
            raise ValueError("Students placed cannot exceed eligible students")
        return self


class PlacementYearRead(ReadMeta, PlacementYearIn):
    model_config = READ_CONFIG

    @computed_field
    @property
    def placement_percentage(self) -> float | None:
        if self.eligible_students and self.students_placed is not None:
            return round(self.students_placed * 100 / self.eligible_students, 1)
        return None


class PlacementYearPublic(PlacementYearRead):
    @model_validator(mode="after")
    def _hide_average(self):
        if not self.publish_average:
            self.average_package_lpa = None
        return self


class PlacementIn(ContentIn):
    academic_year: AcademicYear
    student_name: S(150)
    student_id: int | None = None
    company: S(200)
    role: S(150) | None = None
    package_lpa: float | None = Field(None, ge=0, le=1000)
    offer_type: S(30) | None = None


class PlacementRead(ReadMeta, PlacementIn):
    model_config = READ_CONFIG


class RecruiterIn(ContentIn):
    name: S(200)
    logo_url: Url | None = None
    website_url: Url | None = None
    display_order: int = Field(100, ge=0, le=10000)


class RecruiterRead(ReadMeta, RecruiterIn):
    model_config = READ_CONFIG


class InternshipIn(ContentIn):
    kind: choice(O.INTERNSHIP_KINDS) = "OPENING"
    company: S(200)
    role: S(150)
    duration: S(60) | None = None
    location: S(150) | None = None
    mode: choice(O.MODES) | None = None
    eligibility: S(300) | None = None
    deadline: dt.date | None = None
    stipend: S(100) | None = None
    description: Text | None = None
    apply_url: Url | None = None
    student_name: S(150) | None = None
    academic_year: AcademicYear | None = None

    @model_validator(mode="after")
    def _check_kind(self):
        if self.kind == "STUDENT" and not self.student_name:
            raise ValueError("Student name is required for a student internship record")
        return self


class InternshipRead(ReadMeta, InternshipIn):
    model_config = READ_CONFIG


# ---------------------------------------------------------------- Research
class PublicationIn(ContentIn):
    title: S(400)
    authors: S(600)
    faculty_id: int | None = None
    is_student_publication: bool = False
    pub_type: choice(O.PUBLICATION_TYPES)
    venue: S(300) | None = None
    year: Year
    doi: S(200) | None = None
    url: Url | None = None
    domain: S(150) | None = None
    indexing: S(100) | None = None


class PublicationRead(ReadMeta, PublicationIn):
    model_config = READ_CONFIG
    faculty: FacultyRef | None = None


class PatentIn(ContentIn):
    title: S(400)
    inventors: S(600)
    faculty_id: int | None = None
    application_no: S(100) | None = None
    patent_no: S(100) | None = None
    patent_status: choice(O.PATENT_STATUSES)
    filed_date: dt.date | None = None
    granted_date: dt.date | None = None
    year: Year
    domain: S(150) | None = None
    url: Url | None = None


class PatentRead(ReadMeta, PatentIn):
    model_config = READ_CONFIG
    faculty: FacultyRef | None = None


class ResearchProjectIn(ContentIn):
    title: S(400)
    pi_faculty_id: int | None = None
    investigators: S(500) | None = None
    funding_agency: S(250) | None = None
    amount_lakhs: float | None = Field(None, ge=0)
    start_date: dt.date | None = None
    end_date: dt.date | None = None
    year: Year
    project_status: choice(O.PROJECT_STATUSES)
    domain: S(150) | None = None
    collaboration_partner: S(250) | None = None
    is_industry_collaboration: bool = False
    description: Text | None = None


class ResearchProjectRead(ReadMeta, ResearchProjectIn):
    model_config = READ_CONFIG
    pi_faculty: FacultyRef | None = None


class LaboratoryIn(ContentIn):
    name: S(200)
    description: Text | None = None
    image_url: Url | None = None
    equipment: StrList = []
    software: StrList = []
    incharge_faculty_id: int | None = None
    courses: StrList = []
    student_projects: Text | None = None
    is_research_lab: bool = False
    research_domains: StrList = []
    display_order: int = Field(100, ge=0, le=10000)


class LaboratoryRead(ReadMeta, LaboratoryIn):
    model_config = READ_CONFIG
    slug: str
    incharge_faculty: FacultyRef | None = None


# ---------------------------------------------------------------- Projects, alumni, news, gallery
class ProjectIn(ContentIn):
    title: S(300)
    description: Text | None = None
    students: S(500)
    guide_faculty_id: int | None = None
    domain: S(150) | None = None
    technologies: StrList = []
    academic_year: AcademicYear
    github_url: Url | None = None
    demo_url: Url | None = None
    publication: S(500) | None = None
    image_urls: list[Url] = Field(default=[], max_length=12)
    is_featured: bool = False


class ProjectRead(ReadMeta, ProjectIn):
    model_config = READ_CONFIG
    guide_faculty: FacultyRef | None = None


class AlumnusIn(ContentIn):
    name: S(150)
    batch: Batch | None = None
    graduation_year: Year
    organization: S(200) | None = None
    designation: S(150) | None = None
    higher_studies: S(300) | None = None
    achievements: Text | None = None
    testimonial: Text | None = None
    events_participated: Text | None = None
    photo_url: Url | None = None
    linkedin_url: Url | None = None


class AlumnusRead(ReadMeta, AlumnusIn):
    model_config = READ_CONFIG


class NewsIn(ContentIn):
    title: S(300)
    summary: S(600)
    content: Text | None = None
    cover_image_url: Url | None = None
    published_on: dt.date
    category: choice(O.NEWS_CATEGORIES)
    author: S(150) | None = None
    image_urls: list[Url] = Field(default=[], max_length=20)
    external_url: Url | None = None
    is_featured: bool = False


class NewsRead(ReadMeta, NewsIn):
    model_config = READ_CONFIG
    slug: str


class NewsListItem(BaseModel):
    model_config = READ_CONFIG
    id: int
    slug: str
    title: str
    summary: str
    cover_image_url: str | None = None
    published_on: dt.date
    category: str
    author: str | None = None


class GalleryAlbumIn(ContentIn):
    title: S(200)
    description: Text | None = None
    cover_image_url: Url | None = None
    event_date: dt.date | None = None
    category: choice(O.GALLERY_CATEGORIES) | None = None


class GalleryImageIn(InSchema):
    image_url: Url
    caption: S(300) | None = None
    display_order: int = Field(0, ge=0, le=100000)


class GalleryImageRead(BaseModel):
    model_config = READ_CONFIG
    id: int
    image_url: str
    caption: str | None = None
    display_order: int


def _image_count(obj: Any) -> Any:
    if not isinstance(obj, dict):
        data = {k: getattr(obj, k, None) for k in ("id", "slug", "title", "description", "cover_image_url",
                                                   "event_date", "category", "status", "created_at", "updated_at")}
        data["image_count"] = len(obj.images)
        if data["cover_image_url"] is None and obj.images:
            data["cover_image_url"] = obj.images[0].image_url
        return data
    return obj


class GalleryAlbumListItem(BaseModel):
    model_config = READ_CONFIG
    id: int
    slug: str
    title: str
    description: str | None = None
    cover_image_url: str | None = None
    event_date: dt.date | None = None
    category: str | None = None
    status: str
    image_count: int = 0
    created_at: dt.datetime
    updated_at: dt.datetime

    @model_validator(mode="before")
    @classmethod
    def _count(cls, obj: Any) -> Any:
        return _image_count(obj)


class GalleryAlbumRead(ReadMeta, GalleryAlbumIn):
    model_config = READ_CONFIG
    slug: str
    images: list[GalleryImageRead] = []


class VideoIn(ContentIn):
    title: S(250)
    video_url: Url
    description: Text | None = None
    category: choice(O.GALLERY_CATEGORIES) | None = None
    event_date: dt.date | None = None


class VideoRead(ReadMeta, VideoIn):
    model_config = READ_CONFIG


# ---------------------------------------------------------------- Academics
class ProgramIn(ContentIn):
    name: S(200)
    level: choice(O.PROGRAM_LEVELS)
    duration: S(50) | None = None
    intake: int | None = Field(None, ge=0, le=10000)
    description: Text | None = None
    display_order: int = Field(100, ge=0, le=10000)


class ProgramRead(ReadMeta, ProgramIn):
    model_config = READ_CONFIG


class AcademicDocumentIn(ContentIn):
    title: S(250)
    category: choice(O.ACADEMIC_DOCUMENT_CATEGORIES)
    program: S(200) | None = None
    regulation: S(50) | None = None
    academic_year: AcademicYear | None = None
    description: Text | None = None
    file_url: Url | None = None
    external_url: Url | None = None
    display_order: int = Field(100, ge=0, le=10000)

    @model_validator(mode="after")
    def _check_link(self):
        if not self.file_url and not self.external_url:
            raise ValueError("Upload a file or give a link to the document")
        return self


class AcademicDocumentRead(ReadMeta, AcademicDocumentIn):
    model_config = READ_CONFIG
