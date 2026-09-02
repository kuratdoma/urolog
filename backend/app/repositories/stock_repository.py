from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from decimal import Decimal

from app.models.stock import StokUrun, StokAlim, StokHareket, HareketTipi
from app.repositories.patient.models import Hasta
from app.schemas.stock import (
    StokUrunCreate,
    StokUrunUpdate,
    StokAlimCreate,
    StokHareketCreate,
)


class StockError(Exception):
    """Stok iş kuralı ihlali. Endpoint katmanı bunu HTTP 400'e çevirir."""


class StockRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- ÜRÜNLER ---
    async def get_products(
        self, search: Optional[str] = None, skip: int = 0, limit: int = 100
    ) -> List[StokUrun]:
        query = select(StokUrun).filter(StokUrun.aktif.is_(True))

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

    async def _assert_barcode_free(
        self, barkod: Optional[str], exclude_id: Optional[int] = None
    ) -> None:
        """Barkod benzersizliği — DB kısıtı tetiklenmeden anlamlı hata döndürmek için."""
        if not barkod:
            return
        query = select(StokUrun.id).filter(StokUrun.barkod == barkod)
        if exclude_id is not None:
            query = query.filter(StokUrun.id != exclude_id)
        existing = (await self.db.execute(query)).scalars().first()
        if existing:
            raise StockError(f"'{barkod}' barkodu başka bir üründe kayıtlı.")

    async def create_product(self, obj_in: StokUrunCreate) -> StokUrun:
        await self._assert_barcode_free(obj_in.barkod)
        db_obj = StokUrun(**obj_in.model_dump())
        # Yeni ürünün başlangıç maliyeti = tanımlanan birim fiyat
        db_obj.ortalama_maliyet = obj_in.birim_fiyat or Decimal(0)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def update_product(
        self, id: int, obj_in: StokUrunUpdate
    ) -> Optional[StokUrun]:
        db_obj = await self.get_product(id)
        if not db_obj:
            return None

        update_data = obj_in.model_dump(exclude_unset=True)
        if "barkod" in update_data:
            await self._assert_barcode_free(update_data["barkod"], exclude_id=id)

        for field, value in update_data.items():
            setattr(db_obj, field, value)

        # Stoğu olmayan üründe fiyat değişikliği maliyeti de günceller
        if "birim_fiyat" in update_data and (db_obj.mevcut_stok or 0) == 0:
            db_obj.ortalama_maliyet = update_data["birim_fiyat"] or Decimal(0)

        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_product(self, id: int) -> bool:
        db_obj = await self.get_product(id)
        if not db_obj:
            return False

        # Soft delete
        db_obj.aktif = False
        self.db.add(db_obj)
        await self.db.flush()
        return True

    # --- HAREKETLER VE STOK GÜNCELLEME ---
    async def create_movement(
        self, obj_in: StokHareketCreate, user_id: Optional[int] = None
    ) -> StokHareket:
        # 1. Ürünü satır kilidiyle al. Kilit, stok kontrolünden ÖNCE alınmalı ki
        #    kontrol ile yazma arasına başka bir işlem giremesin (race condition).
        result = await self.db.execute(
            select(StokUrun).where(StokUrun.id == obj_in.urun_id).with_for_update()
        )
        product = result.scalar_one_or_none()
        if not product:
            raise StockError("Ürün bulunamadı.")

        hareket_tipi = HareketTipi(obj_in.hareket_tipi)

        # 2. Stok değişimini hesapla
        if hareket_tipi is HareketTipi.DUZELTME:
            # Düzeltmede istemciden gelen 'miktar' sayımda bulunan gerçek stoktur.
            # Ledger'a mutlak sayı değil, aradaki matematiksel fark yazılır.
            change_amount = obj_in.miktar - (product.mevcut_stok or 0)
        else:
            if obj_in.miktar <= 0:
                raise StockError(
                    "Giriş ve çıkış hareketlerinde miktar 0'dan büyük olmalıdır."
                )
            change_amount = (
                -obj_in.miktar if hareket_tipi is HareketTipi.CIKIS else obj_in.miktar
            )

        new_stock = (product.mevcut_stok or 0) + change_amount
        if new_stock < 0:
            raise StockError(
                f"Yetersiz stok: '{product.urun_adi}' için mevcut "
                f"{product.mevcut_stok}, talep edilen çıkış {abs(change_amount)}."
            )

        # 3. Hareketi kaydet
        db_obj = StokHareket(**obj_in.model_dump())
        db_obj.hareket_tipi = hareket_tipi.value
        db_obj.miktar = change_amount
        if user_id:
            db_obj.kullanici_id = user_id
        self.db.add(db_obj)

        # 4. Sayacı güncelle
        product.mevcut_stok = new_stock
        self.db.add(product)

        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    @staticmethod
    def _row_to_dict(instance: Any, **extra: Any) -> Dict[str, Any]:
        """ORM satırını, join'den gelen ek alanlarla birlikte dict'e çevir."""
        data = {
            column.name: getattr(instance, column.name)
            for column in instance.__table__.columns
        }
        data.update(extra)
        return data

    async def get_movements(
        self,
        product_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Hareketleri ürün ve hasta adlarıyla birlikte döndürür."""
        query = (
            select(StokHareket, StokUrun.urun_adi, Hasta.ad, Hasta.soyad)
            .join(StokUrun, StokHareket.urun_id == StokUrun.id)
            .outerjoin(Hasta, StokHareket.hasta_id == Hasta.id)
        )
        if product_id:
            query = query.filter(StokHareket.urun_id == product_id)

        query = (
            query.order_by(StokHareket.islem_tarihi.desc(), StokHareket.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)

        rows: List[Dict[str, Any]] = []
        for hareket, urun_adi, hasta_ad, hasta_soyad in result.all():
            hasta_adi = (
                f"{hasta_ad or ''} {hasta_soyad or ''}".strip()
                if (hasta_ad or hasta_soyad)
                else None
            )
            rows.append(
                self._row_to_dict(hareket, urun_adi=urun_adi, hasta_adi=hasta_adi)
            )
        return rows

    # --- ALIMLAR ---
    async def create_purchase(self, obj_in: StokAlimCreate) -> StokAlim:
        # 1. Ürünü kilitle
        result = await self.db.execute(
            select(StokUrun).where(StokUrun.id == obj_in.urun_id).with_for_update()
        )
        product = result.scalar_one_or_none()
        if not product:
            raise StockError("Ürün bulunamadı.")

        # 2. Alım kaydı
        db_obj = StokAlim(**obj_in.model_dump())
        if not db_obj.toplam_tutar:
            db_obj.toplam_tutar = Decimal(db_obj.miktar) * db_obj.birim_fiyat
        self.db.add(db_obj)

        # 3. Otomatik stok hareketi (ledger)
        hareket = StokHareket(
            urun_id=obj_in.urun_id,
            hareket_tipi=HareketTipi.GIRIS.value,
            miktar=obj_in.miktar,
            kaynak="Satın Alım",
            kaynak_ref=db_obj.fatura_no,
            notlar=f"Firma ID: {obj_in.firma_id or '-'}",
            # Kolon DateTime(timezone=True): naive yerel saat yazılırsa hareket
            # diğer damgalarla sunucu ofseti kadar kayar (AGENTS.md §4.4 — UTC saklanır).
            islem_tarihi=obj_in.alim_tarihi or datetime.now(timezone.utc),
        )
        self.db.add(hareket)

        # 4. Ağırlıklı ortalama maliyeti güncelle.
        #    Son alış fiyatıyla değerleme, fiyat dalgalanmasında stok değerini
        #    yanıltıcı gösterdiği için maliyet ayrı tutulur.
        eski_stok = product.mevcut_stok or 0
        eski_maliyet = Decimal(product.ortalama_maliyet or 0)
        yeni_stok = eski_stok + obj_in.miktar
        if yeni_stok > 0:
            # Negatif stoktan çıkışta ağırlık bozulmasın diye taban 0'a çekilir
            agirlikli_eski = Decimal(max(eski_stok, 0)) * eski_maliyet
            agirlikli_yeni = Decimal(obj_in.miktar) * obj_in.birim_fiyat
            bolen = Decimal(max(eski_stok, 0) + obj_in.miktar)
            product.ortalama_maliyet = (agirlikli_eski + agirlikli_yeni) / bolen

        product.birim_fiyat = obj_in.birim_fiyat  # son alış fiyatı
        product.mevcut_stok = yeni_stok
        self.db.add(product)

        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_purchases(
        self,
        product_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """Alımları ürün adıyla birlikte döndürür."""
        query = select(StokAlim, StokUrun.urun_adi).join(
            StokUrun, StokAlim.urun_id == StokUrun.id
        )
        if product_id:
            query = query.filter(StokAlim.urun_id == product_id)

        query = (
            query.order_by(StokAlim.alim_tarihi.desc(), StokAlim.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(query)

        return [
            self._row_to_dict(alim, urun_adi=urun_adi)
            for alim, urun_adi in result.all()
        ]

    # --- ÖZET ---
    async def get_summary(self):
        # Toplam ürün sayısı
        count_res = await self.db.execute(
            select(func.count(StokUrun.id)).filter(StokUrun.aktif.is_(True))
        )
        total_products = count_res.scalar() or 0

        # Toplam stok adedi ve değeri. Değerleme ağırlıklı ortalama maliyet
        # üzerinden; maliyeti henüz oluşmamış (0/NULL) üründe birim fiyata düşer.
        sum_res = await self.db.execute(
            select(
                func.coalesce(func.sum(StokUrun.mevcut_stok), 0),
                func.coalesce(
                    func.sum(
                        StokUrun.mevcut_stok
                        * func.coalesce(
                            func.nullif(StokUrun.ortalama_maliyet, 0),
                            StokUrun.birim_fiyat,
                            0,
                        )
                    ),
                    0,
                ),
            ).filter(StokUrun.aktif.is_(True))
        )
        row = sum_res.first()
        total_stock_count = row[0] if row else 0
        total_stock_value = row[1] if row else 0

        # Düşük stoklu ürünler
        low_stock_res = await self.db.execute(
            select(func.count(StokUrun.id))
            .filter(StokUrun.aktif.is_(True))
            .filter(StokUrun.mevcut_stok <= StokUrun.min_stok)
        )
        low_stock_count = low_stock_res.scalar() or 0

        return {
            "toplam_urun": total_products,
            "toplam_stok_adedi": int(total_stock_count),
            "toplam_stok_degeri": Decimal(total_stock_value),
            "dusuk_stoklu_urunler": low_stock_count,
        }
