import math
import re
from datetime import datetime
from typing import Annotated, Any, Generic, Literal, TypeVar
from urllib.parse import urlparse

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, Field, StringConstraints, model_validator

Status = Literal["DRAFT", "PUBLISHED", "ARCHIVED"]
STATUSES: tuple[str, ...] = ("DRAFT", "PUBLISHED", "ARCHIVED")


def S(max_length: int, min_length: int = 1):
    """Trimmed string with length bounds."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=min_length, max_length=max_length)]


Text = S(20000)


def _check_url(value: str) -> str:
    # Local storage serves uploads from /media/...; everything else must be absolute http(s).
    if value.startswith("/media/"):
        return value
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        raise ValueError("must be a valid http(s) URL")
    return value


Url = Annotated[str, StringConstraints(strip_whitespace=True, max_length=500), AfterValidator(_check_url)]


def _split_list(value: Any) -> Any:
    if value is None:
        return []
    if isinstance(value, str):
        parts = re.split(r"[\n,;]", value)
        return [p.strip() for p in parts if p.strip()]
    if isinstance(value, list):
        return [v.strip() if isinstance(v, str) else v for v in value if not (isinstance(v, str) and not v.strip())]
    return value


StrList = Annotated[list[S(300)], BeforeValidator(_split_list), Field(max_length=200)]

Year = Annotated[int, Field(ge=1950, le=2100)]
AcademicYear = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{4}-\d{2}$")]  # 2025-26
Batch = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^\d{4}-\d{4}$")]  # 2023-2027


def choice(values: tuple[str, ...] | list[str]):
    return Literal[tuple(values)]  # type: ignore[valid-type]


class InSchema(BaseModel):
    """Base for all write payloads: trims strings, blank -> None, rejects unknown fields."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    @model_validator(mode="before")
    @classmethod
    def _blank_to_none(cls, data: Any) -> Any:
        if isinstance(data, dict):
            return {k: (None if isinstance(v, str) and not v.strip() else v) for k, v in data.items()}
        return data


class ContentIn(InSchema):
    status: Status = "DRAFT"


READ_CONFIG = ConfigDict(from_attributes=True, extra="ignore")


class ReadMeta(BaseModel):
    """Fields every stored record exposes."""

    model_config = READ_CONFIG
    id: int
    status: str
    created_at: datetime
    updated_at: datetime


T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

    @classmethod
    def build(cls, items: list, total: int, page: int, page_size: int):
        return cls(items=items, total=total, page=page, page_size=page_size,
                   pages=max(1, math.ceil(total / page_size)) if page_size else 1)


class Ref(BaseModel):
    """Compact reference to a related record."""

    model_config = READ_CONFIG
    id: int
    name: str


class FacultyRef(Ref):
    slug: str
