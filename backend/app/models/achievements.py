import datetime as dt

from sqlalchemy import Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, ContentMixin
from app.models.people import Faculty, Student


class FacultyAchievement(ContentMixin, Base):
    __tablename__ = "faculty_achievements"

    faculty_id: Mapped[int] = mapped_column(ForeignKey("faculty.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    date: Mapped[dt.date | None] = mapped_column(Date)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    organization: Mapped[str | None] = mapped_column(String(250))
    level: Mapped[str | None] = mapped_column(String(20))
    research_domain: Mapped[str | None] = mapped_column(String(150), index=True)
    image_url: Mapped[str | None] = mapped_column(String(500))
    document_url: Mapped[str | None] = mapped_column(String(500))
    external_url: Mapped[str | None] = mapped_column(String(500))

    faculty: Mapped[Faculty] = relationship(lazy="joined")


class StudentAchievement(ContentMixin, Base):
    __tablename__ = "student_achievements"

    student_id: Mapped[int | None] = mapped_column(ForeignKey("students.id", ondelete="SET NULL"), index=True)
    participants: Mapped[str] = mapped_column(String(500), nullable=False)  # student or team members
    team_name: Mapped[str | None] = mapped_column(String(150))
    batch: Mapped[str | None] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    event_name: Mapped[str | None] = mapped_column(String(250))
    organizer: Mapped[str | None] = mapped_column(String(250))
    position: Mapped[str | None] = mapped_column(String(100))
    date: Mapped[dt.date | None] = mapped_column(Date)
    year: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    certificate_url: Mapped[str | None] = mapped_column(String(500))
    external_url: Mapped[str | None] = mapped_column(String(500))

    student: Mapped[Student | None] = relationship(lazy="joined")
