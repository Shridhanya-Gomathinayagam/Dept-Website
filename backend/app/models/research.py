import datetime as dt

from sqlalchemy import JSON, Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, ContentMixin
from app.models.people import Faculty


class Publication(ContentMixin, Base):
    __tablename__ = "publications"

    title: Mapped[str] = mapped_column(String(400), nullable=False)
    authors: Mapped[str] = mapped_column(String(600), nullable=False)
    faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id", ondelete="SET NULL"), index=True)
    is_student_publication: Mapped[bool] = mapped_column(Boolean, default=False)
    pub_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    venue: Mapped[str | None] = mapped_column(String(300))
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    doi: Mapped[str | None] = mapped_column(String(200), unique=True)
    url: Mapped[str | None] = mapped_column(String(500))
    domain: Mapped[str | None] = mapped_column(String(150), index=True)
    indexing: Mapped[str | None] = mapped_column(String(100))  # Scopus, SCI, ...

    faculty: Mapped[Faculty | None] = relationship(lazy="joined")


class Patent(ContentMixin, Base):
    __tablename__ = "patents"

    title: Mapped[str] = mapped_column(String(400), nullable=False)
    inventors: Mapped[str] = mapped_column(String(600), nullable=False)
    faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id", ondelete="SET NULL"), index=True)
    application_no: Mapped[str | None] = mapped_column(String(100))
    patent_no: Mapped[str | None] = mapped_column(String(100))
    patent_status: Mapped[str] = mapped_column(String(20), nullable=False)  # FILED/PUBLISHED/GRANTED
    filed_date: Mapped[dt.date | None] = mapped_column(Date)
    granted_date: Mapped[dt.date | None] = mapped_column(Date)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    domain: Mapped[str | None] = mapped_column(String(150))
    url: Mapped[str | None] = mapped_column(String(500))

    faculty: Mapped[Faculty | None] = relationship(lazy="joined")


class ResearchProject(ContentMixin, Base):
    """Funded / collaborative research projects."""

    __tablename__ = "research_projects"

    title: Mapped[str] = mapped_column(String(400), nullable=False)
    pi_faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id", ondelete="SET NULL"), index=True)
    investigators: Mapped[str | None] = mapped_column(String(500))
    funding_agency: Mapped[str | None] = mapped_column(String(250))
    amount_lakhs: Mapped[float | None] = mapped_column(Float)
    start_date: Mapped[dt.date | None] = mapped_column(Date)
    end_date: Mapped[dt.date | None] = mapped_column(Date)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    project_status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # ONGOING/COMPLETED
    domain: Mapped[str | None] = mapped_column(String(150))
    collaboration_partner: Mapped[str | None] = mapped_column(String(250))
    is_industry_collaboration: Mapped[bool] = mapped_column(Boolean, default=False)
    description: Mapped[str | None] = mapped_column(Text)

    pi_faculty: Mapped[Faculty | None] = relationship(lazy="joined")


class Laboratory(ContentMixin, Base):
    __tablename__ = "laboratories"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(230), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    equipment: Mapped[list] = mapped_column(JSON, default=list)
    software: Mapped[list] = mapped_column(JSON, default=list)
    incharge_faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id", ondelete="SET NULL"))
    courses: Mapped[list] = mapped_column(JSON, default=list)
    student_projects: Mapped[str | None] = mapped_column(Text)
    is_research_lab: Mapped[bool] = mapped_column(Boolean, default=False)
    research_domains: Mapped[list] = mapped_column(JSON, default=list)
    display_order: Mapped[int] = mapped_column(Integer, default=100)

    incharge_faculty: Mapped[Faculty | None] = relationship(lazy="joined")
