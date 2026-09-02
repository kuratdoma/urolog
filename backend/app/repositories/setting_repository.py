from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.system import SystemSetting


class SettingRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get(self, key: str) -> Optional[SystemSetting]:
        result = await self.db.execute(
            select(SystemSetting).filter(SystemSetting.key == key)
        )
        return result.scalars().first()

    async def get_all(self) -> List[SystemSetting]:
        result = await self.db.execute(select(SystemSetting))
        return result.scalars().all()

    async def create_or_update(
        self, key: str, value: str, description: str = None
    ) -> SystemSetting:
        # Check if exists
        db_obj = await self.get(key)

        # Encrypt API Key before saving
        if key in ["google_api_key", "google_client_id", "google_client_secret"] and value and value != "••••••••••••••••":
            from app.core.security import encrypt_value
            value = encrypt_value(value)

        if db_obj:
            db_obj.value = value
            if description:
                db_obj.description = description
        else:
            db_obj = SystemSetting(key=key, value=value, description=description)
            self.db.add(db_obj)

        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, key: str) -> None:
        db_obj = await self.get(key)
        if db_obj:
            await self.db.delete(db_obj)
            await self.db.flush()
