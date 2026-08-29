from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete
from typing import List
from app.schemas.lab import (
    GenelLabSonucCreate,
    SpermAnaliziCreate,
    UrodinamiCreate,
    GoruntulemeSonucCreate,
    LabUroflowmetriCreate,
)

# Temporary alias to allow import - methods should be updated or deprecated
from app.repositories.clinical.models import TetkikSonuc

# Aliasing for compatibility if types are checked
GenelLabSonuc = TetkikSonuc
SpermAnalizi = TetkikSonuc
Urodinami = TetkikSonuc
GoruntulemeSonuc = TetkikSonuc
LabUroflowmetri = TetkikSonuc


class LabRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Genel Lab
    async def get_genel_lab_by_patient(self, hasta_id: str) -> List[GenelLabSonuc]:
        result = await self.db.execute(
            select(GenelLabSonuc).filter(GenelLabSonuc.hasta_id == hasta_id)
        )
        return result.scalars().all()

    async def create_genel_lab(self, obj_in: GenelLabSonucCreate) -> GenelLabSonuc:
        db_obj = GenelLabSonuc(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def create_genel_lab_batch(
        self, objs_in: List[GenelLabSonucCreate]
    ) -> List[GenelLabSonuc]:
        db_objs = [GenelLabSonuc(**obj.dict()) for obj in objs_in]
        self.db.add_all(db_objs)
        await self.db.commit()
        for obj in db_objs:
            await self.db.refresh(obj)
        return db_objs

    async def delete_genel_lab_batch(self, ids: List[int]) -> bool:
        if not ids:
            return False
        await self.db.execute(delete(GenelLabSonuc).where(GenelLabSonuc.id.in_(ids)))
        await self.db.commit()
        return True

    # Sperm Analizi
    async def get_sperm_by_patient(self, hasta_id: str) -> List[SpermAnalizi]:
        result = await self.db.execute(
            select(SpermAnalizi).filter(SpermAnalizi.hasta_id == hasta_id)
        )
        return result.scalars().all()

    async def create_sperm(self, obj_in: SpermAnaliziCreate) -> SpermAnalizi:
        db_obj = SpermAnalizi(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    # Goruntuleme
    async def get_goruntuleme_by_patient(self, hasta_id: str) -> List[GoruntulemeSonuc]:
        result = await self.db.execute(
            select(GoruntulemeSonuc).filter(GoruntulemeSonuc.hasta_id == hasta_id)
        )
        return result.scalars().all()

    async def create_goruntuleme(
        self, obj_in: GoruntulemeSonucCreate
    ) -> GoruntulemeSonuc:
        db_obj = GoruntulemeSonuc(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    # Urodinami
    async def get_urodinami_by_patient(self, hasta_id: str) -> List[Urodinami]:
        result = await self.db.execute(
            select(Urodinami).filter(Urodinami.hasta_id == hasta_id)
        )
        return result.scalars().all()

    async def create_urodinami(self, obj_in: UrodinamiCreate) -> Urodinami:
        db_obj = Urodinami(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    # Uroflowmetri (NEW)
    async def get_uroflowmetri_by_patient(self, hasta_id: str) -> List[LabUroflowmetri]:
        result = await self.db.execute(
            select(LabUroflowmetri)
            .filter(LabUroflowmetri.hasta_id == hasta_id)
            .order_by(LabUroflowmetri.tarih.desc())
        )
        return result.scalars().all()

    async def create_uroflowmetri(
        self, obj_in: LabUroflowmetriCreate
    ) -> LabUroflowmetri:
        db_obj = LabUroflowmetri(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_uroflowmetri(self, id: int) -> bool:
        result = await self.db.execute(
            select(LabUroflowmetri).filter(LabUroflowmetri.id == id)
        )
        obj = result.scalar_one_or_none()
        if obj:
            await self.db.delete(obj)
            await self.db.commit()
            return True
        return False
