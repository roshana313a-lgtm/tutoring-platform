from fastapi.responses import JSONResponse


class EmailAlreadyExistsError(Exception):
    """Raised when registering an email that already exists."""


class InvalidCredentialsError(Exception):
    """Raised when login credentials are invalid."""


class InvalidTokenError(Exception):
    """Raised when a JWT access token is missing, malformed, expired, or invalid."""


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
