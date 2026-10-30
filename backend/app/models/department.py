import datetime as dt

from sqlalchemy import JSON, Date, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, ContentMixin, IdMixin, TimestampMixin


class Department(IdMixin, TimestampMixin, Base):
    """Single-row department profile (identity, about, HOD, contact)."""

    __tablename__ = "department"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    short_name: Mapped[str | None] = mapped_column(String(50))
    college_name: Mapped[str | None] = mapped_column(String(250))
    college_logo_url: Mapped[str | None] = mapped_column(String(500))
    hero_image_url: Mapped[str | None] = mapped_column(String(500))
    tagline: Mapped[str | None] = mapped_column(String(300))
    intro: Mapped[str | None] = mapped_column(Text)
    overview: Mapped[str | None] = mapped_column(Text)
    vision: Mapped[str | None] = mapped_column(Text)
    mission: Mapped[list] = mapped_column(JSON, default=list)
    peos: Mapped[list] = mapped_column(JSON, default=list)
    pos: Mapped[list] = mapped_column(JSON, default=list)
    psos: Mapped[list] = mapped_column(JSON, default=list)
    objectives: Mapped[list] = mapped_column(JSON, default=list)
    year_established: Mapped[int | None] = mapped_column(Integer)
    accreditation: Mapped[str | None] = mapped_column(Text)
    recognition: Mapped[str | None] = mapped_column(Text)
    facilities: Mapped[list] = mapped_column(JSON, default=list)
    hod_name: Mapped[str | None] = mapped_column(String(150))
    hod_designation: Mapped[str | None] = mapped_column(String(150))
    hod_photo_url: Mapped[str | None] = mapped_column(String(500))
    hod_message: Mapped[str | None] = mapped_column(Text)
    address: Mapped[str | None] = mapped_column(Text)
    college_address: Mapped[str | None] = mapped_column(Text)
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))
    map_embed_url: Mapped[str | None] = mapped_column(String(1000))
    college_website: Mapped[str | None] = mapped_column(String(500))
    social_links: Mapped[list] = mapped_column(JSON, default=list)  # [{label, url}]
    important_links: Mapped[list] = mapped_column(JSON, default=list)  # [{label, url}]


class Highlight(ContentMixin, Base):
    """Admin-curated featured items for the homepage."""

    __tablename__ = "highlights"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    link_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=0)


class Mou(ContentMixin, Base):
    """Memorandum of understanding with an industry, academic or research partner."""

    __tablename__ = "mous"

    organization: Mapped[str] = mapped_column(String(250), nullable=False)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    signed_on: Mapped[dt.date | None] = mapped_column(Date, index=True)
    valid_until: Mapped[dt.date | None] = mapped_column(Date)
    purpose: Mapped[str | None] = mapped_column(Text)
    website_url: Mapped[str | None] = mapped_column(String(500))
    document_url: Mapped[str | None] = mapped_column(String(500))
    display_order: Mapped[int] = mapped_column(Integer, default=100)
