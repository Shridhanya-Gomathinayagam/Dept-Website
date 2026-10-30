import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1 import admin, auth, department, excel, site
from app.core.config import get_settings
from app.crud.resource import build_admin_router, build_public_router
from app.resources import RESOURCES

logger = logging.getLogger("dept_hub")
API_PREFIX = "/api/v1"


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Department Digital Hub API",
        version="1.0.0",
        docs_url=None if settings.is_production else "/api/docs",
        redoc_url=None,
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )

    for r in (auth.router, department.router, site.router, admin.router, excel.router):
        app.include_router(r, prefix=API_PREFIX)
    for res in RESOURCES:
        if res.public:
            app.include_router(build_public_router(res), prefix=API_PREFIX)
        app.include_router(build_admin_router(res), prefix=API_PREFIX)

    if not settings.use_cloudinary:
        settings.media_dir.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.url.path.startswith(f"{API_PREFIX}/admin") or request.url.path.startswith(f"{API_PREFIX}/auth"):
            response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        errors = [{"field": ".".join(str(p) for p in e["loc"] if p not in ("body", "query")),
                   "message": e["msg"].removeprefix("Value error, ")} for e in exc.errors()]
        return JSONResponse({"detail": "Please correct the highlighted fields.", "errors": errors}, status_code=422)

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        logger.exception("Unhandled error on %s %s", request.method, request.url.path)
        return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)

    @app.get("/api/health", include_in_schema=False)
    def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
