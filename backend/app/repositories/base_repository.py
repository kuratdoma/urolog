"""
Generic async CRUD base repository.

All entity repositories inherit from this class, specifying only the SQLAlchemy
model. Eliminates the repetitive get/create/update/delete pattern that was
duplicated 11+ times across the clinical repository.

Complexity: O(1) for all single-record operations (PK lookup).
"""
from typing import TypeVar, Generic, Type, Optional, List, Any
from uuid import UUID
from datetime import datetime, date

from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base_class import Base
from app.core.user_context import UserContext

ModelType = TypeVar("ModelType", bound=Base)


class BaseRepository(Generic[ModelType]):
    """
    Async CRUD operations for any model with soft-delete and audit fields.

    Assumptions on model:
        - `id` primary key (Integer or UUID)
        - `is_deleted` Boolean column
        - `hasta_id` UUID column (for patient-scoped queries)
        - `tarih` DateTime column (for ordering)
        - `created_by` / `updated_by` Integer columns
    """

    def __init__(
        self,
        model: Type[ModelType],
        session: AsyncSession,
        context: Optional[UserContext] = None,
    ):
        self.model = model
        self.session = session
        self.context = context

    async def get_by_id(self, record_id: Any) -> Optional[ModelType]:
        stmt = select(self.model).where(
            and_(self.model.id == record_id, self.model.is_deleted == False)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_patient(
        self, patient_id: UUID, order_desc: bool = True
    ) -> List[ModelType]:
        stmt = select(self.model).where(
            and_(
                self.model.hasta_id == patient_id,
                self.model.is_deleted == False,
            )
        )
        if hasattr(self.model, "tarih"):
            col = self.model.tarih
            stmt = stmt.order_by(col.desc() if order_desc else col.asc())
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create(self, data: Any) -> ModelType:
        raw = data.model_dump() if hasattr(data, "model_dump") else data
        valid = {k: v for k, v in raw.items() if hasattr(self.model, k)}

        # Coerce date → datetime for non-nullable tarih
        tarih = valid.get("tarih")
        if tarih is None and hasattr(self.model, "tarih"):
            valid["tarih"] = datetime.now()
        elif isinstance(tarih, date) and not isinstance(tarih, datetime):
            valid["tarih"] = datetime.combine(tarih, datetime.min.time())

        obj = self.model(**valid)
        if self.context:
            obj.created_by = self.context.user_id
        self.session.add(obj)
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def update(self, record_id: Any, data: Any) -> Optional[ModelType]:
        obj = await self.get_by_id(record_id)
        if not obj:
            return None
        raw = (
            data.model_dump(exclude_unset=True)
            if hasattr(data, "model_dump")
            else data
        )
        from sqlalchemy import DateTime
        for k, v in raw.items():
            if hasattr(obj, k):
                if isinstance(v, date) and not isinstance(v, datetime):
                    col = getattr(self.model, k, None)
                    if col is not None and hasattr(col, "type") and isinstance(col.type, DateTime):
                        v = datetime.combine(v, datetime.min.time())
                setattr(obj, k, v)
        if self.context:
            obj.updated_by = self.context.user_id
        await self.session.flush()
        await self.session.commit()
        await self.session.refresh(obj)
        return obj

    async def soft_delete(self, record_id: Any) -> bool:
        stmt = (
            update(self.model)
            .where(self.model.id == record_id)
            .values(is_deleted=True)
        )
        result = await self.session.execute(stmt)
        await self.session.commit()
        return result.rowcount > 0
