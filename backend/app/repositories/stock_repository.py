from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from decimal import Decimal

from app.models.stock import StokUrun, StokAlim, StokHareket, HareketTipi
from app.schemas.stock import (
    StokUrunCreate,
    StokUrunUpdate,
    StokAlimCreate,
    StokHareketCreate,
)


class StockRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- ÜRÜNLER ---
    async def get_products(
        self, search: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[StokUrun]:
        query = select(StokUrun).filter(StokUrun.aktif == True)

        if search:
            search_filter = (
                StokUrun.urun_adi.ilike(f"%{search}%")
                | StokUrun.marka.ilike(f"%{search}%")
                | StokUrun.barkod.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)

        query = query.order_by(StokUrun.urun_adi).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_product(self, id: int) -> Optional[StokUrun]:
        result = await self.db.execute(select(StokUrun).filter(StokUrun.id == id))
        return result.scalars().first()

    async def create_product(self, obj_in: StokUrunCreate) -> StokUrun:
        db_obj = StokUrun(**obj_in.dict())
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def update_product(
        self, id: int, obj_in: StokUrunUpdate
    ) -> Optional[StokUrun]:
        db_obj = await self.get_product(id)
        if not db_obj:
            return None

        update_data = obj_in.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_obj, field, value)

        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_product(self, id: int) -> bool:
        db_obj = await self.get_product(id)
        if not db_obj:
            return False

        # Soft delete
        db_obj.aktif = False
        self.db.add(db_obj)
        await self.db.commit()
        return True

    # --- HAREKETLER VE STOK GÜNCELLEME ---
    async def create_movement(
        self, obj_in: StokHareketCreate, user_id: Optional[int] = None
    ) -> StokHareket:
        # 1. Hareketi kaydet
        db_obj = StokHareket(**obj_in.dict())
        if user_id:
            db_obj.kullanici_id = user_id

        self.db.add(db_obj)

        # 2. Ürün stoğunu güncelle (Satır kilitleme ile yarış koşullarını - race conditions - engelle)
        result = await self.db.execute(
            select(StokUrun).where(StokUrun.id == obj_in.urun_id).with_for_update()
        )
        product = result.scalar_one_or_none()
        
        if product:
            change_amount = obj_in.miktar

            # Eğer miktar pozitif geldiyse ama tip CIKIS ise negatife çevir
            if obj_in.hareket_tipi == HareketTipi.CIKIS.value and change_amount > 0:
                change_amount = -change_amount
            # Eğer miktar negatif geldiyse ama tip GIRIS ise pozitife çevir
            elif obj_in.hareket_tipi == HareketTipi.GIRIS.value and change_amount < 0:
                change_amount = -change_amount
            elif obj_in.hareket_tipi == HareketTipi.DUZELTME.value:
                # Düzeltmede istemciden gelen 'miktar' gerçek stok sayısıdır. Farkı sadece sunucuda hesapla.
                actual_count = obj_in.miktar
                change_amount = actual_count - product.mevcut_stok
                # Kayda mutlak değeri değil aradaki "matematiksel farkı" işle (ledger correction)
                db_obj.miktar = change_amount

            product.mevcut_stok += change_amount
            self.db.add(product)

        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_movements(
        self, product_id: Optional[int] = None, limit: int = 50
    ) -> List[StokHareket]:
        query = select(StokHareket)
        if product_id:
            query = query.filter(StokHareket.urun_id == product_id)

        query = query.order_by(StokHareket.islem_tarihi.desc()).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    # --- ALIMLAR ---
    async def create_purchase(self, obj_in: StokAlimCreate) -> StokAlim:
        # 1. Alım kaydı
        db_obj = StokAlim(**obj_in.dict())

        # Toplam tutar hesapla (eğer boş geldiyse)
        if not db_obj.toplam_tutar and db_obj.miktar and db_obj.birim_fiyat:
            db_obj.toplam_tutar = Decimal(db_obj.miktar) * db_obj.birim_fiyat

        self.db.add(db_obj)

        # 2. Ürün stoğunu güncelle (Alım = Stok Girişi, Kilitleme ile)
        result = await self.db.execute(
            select(StokUrun).where(StokUrun.id == obj_in.urun_id).with_for_update()
        )
        product = result.scalar_one_or_none()
        
        if product:
            # Otomatik hareket kaydı da atalım
            hareket = StokHareket(
                urun_id=obj_in.urun_id,
                hareket_tipi=HareketTipi.GIRIS.value,
                miktar=obj_in.miktar,
                kaynak="Satın Alım",
                kaynak_ref=db_obj.fatura_no,
                notlar=f"Firma ID: {obj_in.firma_id or '-'}",
                islem_tarihi=obj_in.alim_tarihi or datetime.now(),
            )
            self.db.add(hareket)

            # Ürün fiyatını güncelle (son alış fiyatı)
            product.birim_fiyat = obj_in.birim_fiyat
            product.mevcut_stok += obj_in.miktar
            self.db.add(product)

        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_purchases(self, product_id: Optional[int] = None) -> List[StokAlim]:
        query = select(StokAlim)
        if product_id:
            query = query.filter(StokAlim.urun_id == product_id)

        query = query.order_by(StokAlim.alim_tarihi.desc())
        result = await self.db.execute(query)
        return result.scalars().all()

    # --- ÖZET ---
    async def get_summary(self):
        # Toplam ürün sayısı
        count_res = await self.db.execute(
            select(func.count(StokUrun.id)).filter(StokUrun.aktif == True)
        )
        total_products = count_res.scalar() or 0

        # Toplam stok adedi ve değeri
        # SQLAlchemy async ile sum biraz farklı olabilir, python tarafında yapalım şimdilik
        # veya func.sum kullanalim
        # result = await self.db.execute(select(StokUrun).filter(StokUrun.aktif == True))
        # products = result.scalars().all()
        # total_stock = sum(p.mevcut_stok for p in products)

        sum_res = await self.db.execute(
            select(
                func.coalesce(func.sum(StokUrun.mevcut_stok), 0),
                func.coalesce(func.sum(StokUrun.mevcut_stok * StokUrun.birim_fiyat), 0),
            ).filter(StokUrun.aktif == True)
        )
        row = sum_res.first()
        total_stock_count = row[0] if row else 0
        total_stock_value = row[1] if row else 0

        # Düşük stoklu ürünler
        low_stock_res = await self.db.execute(
            select(func.count(StokUrun.id))
            .filter(StokUrun.aktif == True)
            .filter(StokUrun.mevcut_stok <= StokUrun.min_stok)
        )
        low_stock_count = low_stock_res.scalar() or 0

        return {
            "toplam_urun": total_products,
            "toplam_stok_adedi": int(total_stock_count),
            "toplam_stok_degeri": Decimal(total_stock_value),
            "dusuk_stoklu_urunler": low_stock_count,
        }
