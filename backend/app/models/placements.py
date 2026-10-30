import datetime as dt

from sqlalchemy import Boolean, Date, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, ContentMixin


class PlacementYear(ContentMixin, Base):
    """Year-wise placement summary published by the department."""

    __tablename__ = "placement_years"

    academic_year: Mapped[str] = mapped_column(String(9), unique=True, nullable=False)  # 2025-26
    eligible_students: Mapped[int | None] = mapped_column(Integer)
    students_placed: Mapped[int | None] = mapped_column(Integer)
    highest_package_lpa: Mapped[float | None] = mapped_column(Float)
    average_package_lpa: Mapped[float | None] = mapped_column(Float)
    publish_average: Mapped[bool] = mapped_column(Boolean, default=False)
    companies_visited: Mapped[int | None] = mapped_column(Integer)
    summary: Mapped[str | None] = mapped_column(Text)


class Placement(ContentMixin, Base):
    """Individual placement offers."""

    __tablename__ = "placements"

    academic_year: Mapped[str] = mapped_column(String(9), nullable=False, index=True)
    student_name: Mapped[str] = mapped_column(String(150), nullable=False)
    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"))
    company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    role: Mapped[str | None] = mapped_column(String(150))
    package_lpa: Mapped[float | None] = mapped_column(Float)
    offer_type: Mapped[str | None] = mapped_column(String(30))


class Recruiter(ContentMixin, Base):
    __tablename__ = "recruiters"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    website_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=100)


class Internship(ContentMixin, Base):
    """Either an internship opening or a student's internship record."""

    __tablename__ = "internships"

    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)  # OPENING / STUDENT
    company: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(150), nullable=False)
    duration: Mapped[str | None] = mapped_column(String(60))
    location: Mapped[str | None] = mapped_column(String(150))
    mode: Mapped[str | None] = mapped_column(String(10), index=True)
    eligibility: Mapped[str | None] = mapped_column(String(300))
    deadline: Mapped[dt.date | None] = mapped_column(Date)
    stipend: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    apply_url: Mapped[str | None] = mapped_column(String(500))
    student_name: Mapped[str | None] = mapped_column(String(150))
    academic_year: Mapped[str | None] = mapped_column(String(9), index=True)
