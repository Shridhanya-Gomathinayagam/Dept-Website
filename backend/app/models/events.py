import datetime as dt

from sqlalchemy import Boolean, Date, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, ContentMixin


class Event(ContentMixin, Base):
    __tablename__ = "events"

    title: Mapped[str] = mapped_column(String(250), nullable=False)
    slug: Mapped[str] = mapped_column(String(280), unique=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    start_at: Mapped[dt.datetime] = mapped_column(DateTime, nullable=False, index=True)  # local campus time
    end_at: Mapped[dt.datetime | None] = mapped_column(DateTime)
    venue: Mapped[str | None] = mapped_column(String(250))
    speaker: Mapped[str | None] = mapped_column(String(250))
    organizer: Mapped[str | None] = mapped_column(String(250))
    description: Mapped[str | None] = mapped_column(Text)
    poster_url: Mapped[str | None] = mapped_column(String(500))
    registration_url: Mapped[str | None] = mapped_column(String(500))
    contact_info: Mapped[str | None] = mapped_column(String(300))
    event_status: Mapped[str] = mapped_column(String(20), default="UPCOMING", nullable=False, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class Opportunity(ContentMixin, Base):
    """External opportunities, verified by an administrator before publishing."""

    __tablename__ = "opportunities"

    title: Mapped[str] = mapped_column(String(250), nullable=False)
    organizer: Mapped[str] = mapped_column(String(250), nullable=False, index=True)
    institution: Mapped[str | None] = mapped_column(String(250))
    city: Mapped[str | None] = mapped_column(String(100), index=True)
    state: Mapped[str | None] = mapped_column(String(100), index=True)
    country: Mapped[str] = mapped_column(String(100), default="India")
    mode: Mapped[str] = mapped_column(String(10), nullable=False, index=True)  # ONLINE/OFFLINE/HYBRID
    category: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    start_date: Mapped[dt.date | None] = mapped_column(Date, index=True)
    end_date: Mapped[dt.date | None] = mapped_column(Date)
    registration_deadline: Mapped[dt.date | None] = mapped_column(Date, index=True)
    eligibility: Mapped[str | None] = mapped_column(String(300))
    team_size: Mapped[str | None] = mapped_column(String(50))
    description: Mapped[str | None] = mapped_column(Text)
    prize_info: Mapped[str | None] = mapped_column(String(500))
    registration_url: Mapped[str] = mapped_column(String(500), nullable=False)
    website_url: Mapped[str | None] = mapped_column(String(500))
    source_url: Mapped[str] = mapped_column(String(500), nullable=False)
    source: Mapped[str] = mapped_column(String(30), default="MANUAL", nullable=False)
    last_verified_at: Mapped[dt.date] = mapped_column(Date, nullable=False)
    poster_url: Mapped[str | None] = mapped_column(String(500))
    contact_info: Mapped[str | None] = mapped_column(String(300))
