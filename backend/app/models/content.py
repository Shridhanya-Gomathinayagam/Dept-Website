import datetime as dt

from sqlalchemy import JSON, Boolean, Date, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, ContentMixin
from app.models.people import Faculty


class Project(ContentMixin, Base):
    __tablename__ = "projects"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    students: Mapped[str] = mapped_column(String(500), nullable=False)
    guide_faculty_id: Mapped[int | None] = mapped_column(ForeignKey("faculty.id", ondelete="SET NULL"), index=True)
    domain: Mapped[str | None] = mapped_column(String(150), index=True)
    technologies: Mapped[list] = mapped_column(JSON, default=list)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False, index=True)
    github_url: Mapped[str | None] = mapped_column(String(500))
    demo_url: Mapped[str | None] = mapped_column(String(500))
    publication: Mapped[str | None] = mapped_column(String(500))
    image_urls: Mapped[list] = mapped_column(JSON, default=list)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)

    guide_faculty: Mapped[Faculty | None] = relationship(lazy="joined")


class News(ContentMixin, Base):
    __tablename__ = "news"

    title: Mapped[str] = mapped_column(String(300), nullable=False)
    slug: Mapped[str] = mapped_column(String(330), unique=True, nullable=False)
    summary: Mapped[str] = mapped_column(String(600), nullable=False)
    content: Mapped[str | None] = mapped_column(Text)  # Markdown; rendered without raw HTML
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    published_on: Mapped[dt.date] = mapped_column(Date, nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    author: Mapped[str | None] = mapped_column(String(150))
    image_urls: Mapped[list] = mapped_column(JSON, default=list)
    external_url: Mapped[str | None] = mapped_column(String(500))
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)


class GalleryAlbum(ContentMixin, Base):
    __tablename__ = "gallery_albums"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(230), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    cover_image_url: Mapped[str | None] = mapped_column(String(500))
    event_date: Mapped[dt.date | None] = mapped_column(Date, index=True)
    category: Mapped[str | None] = mapped_column(String(40), index=True)

    images: Mapped[list["GalleryImage"]] = relationship(
        back_populates="album",
        cascade="all, delete-orphan",
        order_by="GalleryImage.display_order",
        lazy="selectin",
    )


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    album_id: Mapped[int] = mapped_column(ForeignKey("gallery_albums.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    caption: Mapped[str | None] = mapped_column(String(300))
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    album: Mapped[GalleryAlbum] = relationship(back_populates="images")


class Video(ContentMixin, Base):
    """A video (YouTube or other link) shown in the gallery."""

    __tablename__ = "videos"

    title: Mapped[str] = mapped_column(String(250), nullable=False)
    video_url: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str | None] = mapped_column(String(40), index=True)
    event_date: Mapped[dt.date | None] = mapped_column(Date, index=True)
