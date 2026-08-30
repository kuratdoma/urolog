from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_
from app.models.user import User


class UserRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_username(self, username: str) -> User | None:
        """Get user by username (case-insensitive).

        NOT: lower(username) fonksiyonel index'i p010_user_ci_idx ile eklenir;
        o migration olmadan bu sorgu sequential scan'e düşer.
        """
        clean = username.strip().lower()
        if not clean:
            return None
        result = await self.db.execute(
            select(User).filter(func.lower(User.username) == clean).order_by(User.id)
        )
        return result.scalars().first()

    async def get_by_email(self, email: str) -> User | None:
        """Get user by email address (case-insensitive)."""
        clean = email.strip().lower()
        if not clean:
            return None
        result = await self.db.execute(
            select(User).filter(func.lower(User.email) == clean).order_by(User.id)
        )
        return result.scalars().first()

    async def get_by_email_or_username(self, identifier: str) -> User | None:
        """Get user by either email or username (case-insensitive).

        Sütunlardaki unique kısıtlar harfe duyarlı olduğu için yalnızca büyük/küçük
        harfte ayrışan iki kayıt teorik olarak birlikte var olabilir; order_by(User.id)
        eşleşmenin her çağrıda aynı kaydı döndürmesini garanti eder.
        """
        clean = identifier.strip().lower()
        if not clean:
            return None
        result = await self.db.execute(
            select(User)
            .filter(
                or_(
                    func.lower(User.email) == clean,
                    func.lower(User.username) == clean,
                )
            )
            .order_by(User.id)
        )
        return result.scalars().first()

    async def get_by_id(self, user_id: int) -> User | None:
        """Get user by ID."""
        result = await self.db.execute(select(User).filter(User.id == user_id))
        return result.scalars().first()

    async def update_password(self, user: User, hashed_password: str) -> User:
        """Update user's password."""
        user.hashed_password = hashed_password
        await self.db.flush()
        await self.db.refresh(user)
        return user

    async def create(self, user: User) -> User:
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
