from sqlalchemy import JSON, Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, ContentMixin


class Faculty(ContentMixin, Base):
    __tablename__ = "faculty"

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    designation: Mapped[str] = mapped_column(String(150), nullable=False)
    qualification: Mapped[str | None] = mapped_column(String(250))
    specialization: Mapped[str | None] = mapped_column(String(250))
    experience_years: Mapped[int | None] = mapped_column(Integer)
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    show_email: Mapped[bool] = mapped_column(Boolean, default=True)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    bio: Mapped[str | None] = mapped_column(Text)
    research_interests: Mapped[list] = mapped_column(JSON, default=list)
    publications_summary: Mapped[str | None] = mapped_column(Text)
    patents_summary: Mapped[str | None] = mapped_column(Text)
    certifications: Mapped[str | None] = mapped_column(Text)
    workshops: Mapped[str | None] = mapped_column(Text)
    fdps: Mapped[str | None] = mapped_column(Text)
    awards: Mapped[str | None] = mapped_column(Text)
    projects_guided: Mapped[str | None] = mapped_column(Text)
    google_scholar_url: Mapped[str | None] = mapped_column(String(500))
    orcid_url: Mapped[str | None] = mapped_column(String(500))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=100)


class Student(ContentMixin, Base):
    __tablename__ = "students"

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    register_no: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    batch: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # e.g. 2023-2027
    academic_year: Mapped[str | None] = mapped_column(String(10), index=True)  # I, II, III, IV
    section: Mapped[str | None] = mapped_column(String(10), index=True)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    skills: Mapped[list] = mapped_column(JSON, default=list)
    interests: Mapped[list] = mapped_column(JSON, default=list)
    projects_summary: Mapped[str | None] = mapped_column(Text)
    achievements_summary: Mapped[str | None] = mapped_column(Text)
    certifications: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(30))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
    github_url: Mapped[str | None] = mapped_column(String(500))
    # Privacy switches: all off by default; the public API honours them.
    show_photo: Mapped[bool] = mapped_column(Boolean, default=False)
    show_contact: Mapped[bool] = mapped_column(Boolean, default=False)
    show_register_no: Mapped[bool] = mapped_column(Boolean, default=False)


class Alumnus(ContentMixin, Base):
    __tablename__ = "alumni"

    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    batch: Mapped[str | None] = mapped_column(String(20))
    graduation_year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    organization: Mapped[str | None] = mapped_column(String(200))
    designation: Mapped[str | None] = mapped_column(String(150))
    higher_studies: Mapped[str | None] = mapped_column(String(300))
    achievements: Mapped[str | None] = mapped_column(Text)
    testimonial: Mapped[str | None] = mapped_column(Text)
    events_participated: Mapped[str | None] = mapped_column(Text)
    photo_url: Mapped[str | None] = mapped_column(String(500))
    linkedin_url: Mapped[str | None] = mapped_column(String(500))
