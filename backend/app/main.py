from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.auth import router as auth_router
from app.api.v1.uploads import router as uploads_router
from app.core.config import settings
from app.core.errors import error_response

app = FastAPI()
app.include_router(auth_router, prefix="/api/v1")
app.include_router(uploads_router, prefix="/api/v1")

# Uploaded avatars are served from the configured media directory.
_media_root = Path(settings.media_dir)
_media_root.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=_media_root), name="media")

_STATUS_CODES: dict[int, str] = {
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
}


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail and "message" in detail:
        return error_response(
            exc.status_code,
            str(detail["code"]),
            str(detail["message"]),
            detail.get("details"),
        )

    return error_response(
        exc.status_code,
        _STATUS_CODES.get(exc.status_code, "HTTP_ERROR"),
        str(detail),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return error_response(
        422,
        "VALIDATION_ERROR",
        "Validation failed",
        jsonable_encoder(exc.errors()),
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
