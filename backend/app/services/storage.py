"""File storage: Cloudinary in production, local disk for development/tests.

Only the resulting URL is stored in the database.
"""
import io
import re
import uuid
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import urlparse

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

from app.core.config import get_settings

IMAGE_FORMATS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp", "GIF": "gif"}
FOLDER_RE = re.compile(r"^[a-z0-9-]{1,40}$")


@dataclass
class StoredFile:
    url: str
    public_id: str
    kind: str  # image | document
    bytes: int


def _read_limited(upload: UploadFile, max_bytes: int) -> bytes:
    data = upload.file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise HTTPException(413, f"File is too large (max {max_bytes // (1024 * 1024)} MB)")
    if not data:
        raise HTTPException(400, "File is empty")
    return data


def _validate(upload: UploadFile, kind: str) -> tuple[bytes, str]:
    """Return (content, extension) after checking the real file type, not just its name."""
    settings = get_settings()
    if kind == "image":
        data = _read_limited(upload, settings.max_image_mb * 1024 * 1024)
        try:
            with Image.open(io.BytesIO(data)) as img:
                fmt = img.format
                img.verify()
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
            raise HTTPException(400, "Unsupported or corrupt image. Use JPG, PNG, WEBP or GIF.") from None
        if fmt not in IMAGE_FORMATS:
            raise HTTPException(400, "Unsupported image type. Use JPG, PNG, WEBP or GIF.")
        return data, IMAGE_FORMATS[fmt]
    if kind == "document":
        data = _read_limited(upload, settings.max_document_mb * 1024 * 1024)
        if not data.startswith(b"%PDF-"):
            raise HTTPException(400, "Only PDF documents are allowed.")
        return data, "pdf"
    raise HTTPException(400, "Unknown upload kind")


def configure_cloudinary() -> None:
    """Configure the SDK from CLOUDINARY_URL (cloudinary://API_KEY:API_SECRET@CLOUD_NAME).

    Parsed explicitly: the SDK's config(cloudinary_url=...) keyword is ignored by some versions.
    """
    import cloudinary

    parsed = urlparse(get_settings().cloudinary_url)
    if parsed.scheme != "cloudinary" or not (parsed.username and parsed.password and parsed.hostname):
        raise RuntimeError("CLOUDINARY_URL must look like cloudinary://API_KEY:API_SECRET@CLOUD_NAME")
    cloudinary.config(cloud_name=parsed.hostname, api_key=parsed.username, api_secret=parsed.password, secure=True)


def store_upload(upload: UploadFile, kind: str, folder: str) -> StoredFile:
    if not FOLDER_RE.match(folder):
        raise HTTPException(400, "Invalid folder")
    data, ext = _validate(upload, kind)
    settings = get_settings()
    name = uuid.uuid4().hex

    if settings.use_cloudinary:
        import cloudinary
        import cloudinary.uploader

        configure_cloudinary()
        result = cloudinary.uploader.upload(
            io.BytesIO(data),
            folder=f"{settings.cloudinary_folder}/{folder}",
            public_id=name,
            resource_type="image" if kind == "image" else "raw",
            overwrite=False,
        )
        return StoredFile(url=result["secure_url"], public_id=result["public_id"], kind=kind, bytes=len(data))

    target_dir = Path(settings.media_dir) / folder
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{name}.{ext}"
    (target_dir / filename).write_bytes(data)
    return StoredFile(url=f"/media/{folder}/{filename}", public_id=f"{folder}/{filename}", kind=kind, bytes=len(data))
