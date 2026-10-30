from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    env: str = "development"  # development | test | production
    database_url: str = f"sqlite:///{(BASE_DIR / 'dept_hub.db').as_posix()}"

    jwt_secret: str = ""
    jwt_expire_minutes: int = 480
    cookie_secure: bool = False

    cloudinary_url: str = ""
    cloudinary_folder: str = "dept-hub"
    media_dir: Path = BASE_DIR / "media"
    max_image_mb: int = 5
    max_document_mb: int = 10
    max_excel_mb: int = 10

    login_max_attempts: int = 5
    login_window_seconds: int = 900

    @property
    def is_production(self) -> bool:
        return self.env == "production"

    @property
    def use_cloudinary(self) -> bool:
        return bool(self.cloudinary_url)

    @model_validator(mode="after")
    def check_production(self):
        if self.is_production:
            if len(self.jwt_secret) < 32:
                raise ValueError("JWT_SECRET must be set (>= 32 chars) in production")
            if not self.cookie_secure:
                raise ValueError("COOKIE_SECURE must be true in production")
        elif not self.jwt_secret:
            raise ValueError("JWT_SECRET is not set. Copy .env.example to .env and set it.")
        # Files are stored in Cloudinary; the local media folder is only for automated tests.
        if not self.cloudinary_url and self.env != "test":
            raise ValueError("CLOUDINARY_URL must be set (cloudinary://API_KEY:API_SECRET@CLOUD_NAME)")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
