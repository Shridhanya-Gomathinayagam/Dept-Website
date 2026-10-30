from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, ContentMixin


class Program(ContentMixin, Base):
    """A degree programme offered by the department."""

    __tablename__ = "programs"

    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    level: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # UG / PG / PhD
    duration: Mapped[str | None] = mapped_column(String(50))
    intake: Mapped[int | None] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(Text)
    display_order: Mapped[int] = mapped_column(Integer, default=100)


class AcademicDocument(ContentMixin, Base):
    """Curriculum, regulations, calendars, timetables and other downloadable academic documents."""

    __tablename__ = "academic_documents"

    title: Mapped[str] = mapped_column(String(250), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    program: Mapped[str | None] = mapped_column(String(200))
    regulation: Mapped[str | None] = mapped_column(String(50))
    academic_year: Mapped[str | None] = mapped_column(String(9), index=True)
    description: Mapped[str | None] = mapped_column(Text)
    file_url: Mapped[str | None] = mapped_column(String(500))
    external_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=100)
