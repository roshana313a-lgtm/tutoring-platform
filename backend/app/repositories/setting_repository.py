from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import PlatformSetting


class SettingsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_all(self) -> dict[str, str]:
        result = await self.db.execute(select(PlatformSetting))
        return {row.key: row.value for row in result.scalars().all()}

    async def upsert(self, values: dict[str, str]) -> None:
        for key, value in values.items():
            existing = await self.db.get(PlatformSetting, key)
            if existing is None:
                self.db.add(PlatformSetting(key=key, value=value))
            else:
                existing.value = value
        await self.db.commit()
