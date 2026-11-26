from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import (
    AccountSuspendedError,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest

GENERIC_LOGIN_MESSAGE = "Invalid email or password"


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.users = UserRepository(db)

    async def register(self, data: RegisterRequest) -> tuple[User, str]:
        email = str(data.email).lower()
        if await self.users.get_by_email(email) is not None:
            raise EmailAlreadyExistsError(email)

        user = await self.users.create(
            email=email,
            hashed_password=hash_password(data.password),
            role=data.role,
        )
        return user, self._issue_token(user)

    async def login(self, data: LoginRequest) -> tuple[User, str]:
        email = str(data.email).lower()
        user = await self.users.get_by_email(email)

        if user is None or not verify_password(data.password, user.hashed_password):
            raise InvalidCredentialsError(GENERIC_LOGIN_MESSAGE)
        if not user.is_active:
            raise AccountSuspendedError(GENERIC_LOGIN_MESSAGE)

        return user, self._issue_token(user)

    @staticmethod
    def _issue_token(user: User) -> str:
        return create_access_token(str(user.id), user.role)
