from fastapi.responses import JSONResponse


class EmailAlreadyExistsError(Exception):
    """Raised when registering an email that already exists."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""


class InvalidTokenError(Exception):
    """Raised when a JWT access token is missing, malformed, expired, or invalid."""


class RoleFieldNotAllowedError(ValueError):
    """Raised when a profile field belonging to another role is supplied."""

    def __init__(self, fields: list[str]) -> None:
        self.fields = fields
        super().__init__(f"Fields not allowed for this role: {', '.join(fields)}")


def error_response(
    status_code: int,
    code: str,
    message: str,
    details: object | None = None,
) -> JSONResponse:
    """Build the project-standard error envelope (SAD §10.1)."""
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details if details is not None else {},
            }
        },
    )
