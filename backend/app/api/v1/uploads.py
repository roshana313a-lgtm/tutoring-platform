import uuid
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.config import settings
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.uploads import AvatarUploadResponse

AVATAR_URL_PREFIX = "/media/avatars/"
MAX_AVATAR_BYTES = 2 * 1024 * 1024
ALLOWED_AVATAR_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

router = APIRouter(prefix="/uploads", tags=["uploads"])


def _invalid(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail={"code": "VALIDATION_ERROR", "message": message},
    )


@router.post(
    "/avatar",
    response_model=AvatarUploadResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_avatar(
    file: Annotated[UploadFile, File(description="JPEG, PNG, WebP or GIF image")],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AvatarUploadResponse:
    """Store an avatar for the authenticated user and return its public URL."""
    suffix = ALLOWED_AVATAR_TYPES.get((file.content_type or "").lower())
    if suffix is None:
        raise _invalid("Only JPEG, PNG, WebP or GIF images are allowed")

    content = await file.read(MAX_AVATAR_BYTES + 1)
    if not content:
        raise _invalid("Uploaded file is empty")
    if len(content) > MAX_AVATAR_BYTES:
        raise _invalid("Avatar must be 2 MB or smaller")

    directory = Path(settings.media_dir) / "avatars"
    directory.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{suffix}"
    (directory / filename).write_bytes(content)

    return AvatarUploadResponse(avatar_url=f"{AVATAR_URL_PREFIX}{filename}")
