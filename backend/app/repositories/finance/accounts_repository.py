from typing import List, Optional
from sqlalchemy import select, delete, update, and_, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansKategori,
    FinansHizmet,
    Kasa,
    KasaHareket,
    FinansIslem,
    FinansOdeme,
)
from app.schemas.finance import (
    FinansKategoriCreate,
    FinansKategoriUpdate,
    FinansHizmetCreate,
    FinansHizmetUpdate,
    KasaCreate,
    KasaUpdate,
)
from app.core.user_context import UserContext


class AccountsRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    # =========================================================================
    # KATEGORİLER
    # =========================================================================
    async def get_categories(self, tip: Optional[str] = None) -> List[FinansKategori]:
        stmt = select(FinansKategori)
        if tip:
            stmt = stmt.where(FinansKategori.tip == tip)
        stmt = stmt.order_by(FinansKategori.ad)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_category(self, kategori_id: int) -> Optional[FinansKategori]:
        result = await self.session.execute(
            select(FinansKategori).where(FinansKategori.id == kategori_id)
        )
        return result.scalar_one_or_none()

    async def create_category(self, obj_in: FinansKategoriCreate) -> FinansKategori:
        db_obj = FinansKategori(**obj_in.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update_category(
        self, kategori_id: int, obj_in: FinansKategoriUpdate
    ) -> Optional[FinansKategori]:
        db_obj = await self.get_category(kategori_id)
        if not db_obj:
            return None
        for key, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return db_obj

    async def delete_category(self, kategori_id: int) -> bool:
        """
        Kategoriyi siler.

        Kullanımdaki kategori silinirse geçmiş işlemlerin sınıflandırması kaybolur;
        bu yüzden önce referans kontrolü yapılır.
        """
        kullanim = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(FinansIslem)
                    .where(FinansIslem.kategori_id == kategori_id)
                )
            ).scalar()
            or 0
        )
        if kullanim:
            raise ValueError(
                f"Bu kategori {kullanim} işlemde kullanılıyor, silinemez. "
                "Kullanımdan kaldırmak için kategoriyi pasife alın."
            )

        alt_kategori = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(FinansKategori)
                    .where(FinansKategori.ust_kategori_id == kategori_id)
                )
            ).scalar()
            or 0
        )
        if alt_kategori:
            raise ValueError(
                f"Bu kategorinin {alt_kategori} alt kategorisi var, önce onları silin."
            )

        result = await self.session.execute(
            delete(FinansKategori).where(FinansKategori.id == kategori_id)
        )
        return result.rowcount > 0

    # =========================================================================
    # HİZMETLER
    # =========================================================================
    async def get_services(self, aktif_only: bool = True) -> List[FinansHizmet]:
        stmt = select(FinansHizmet)
        if aktif_only:
            stmt = stmt.where(FinansHizmet.aktif == True)
        stmt = stmt.order_by(FinansHizmet.ad)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_service(self, hizmet_id: int) -> Optional[FinansHizmet]:
        result = await self.session.execute(
            select(FinansHizmet).where(FinansHizmet.id == hizmet_id)
        )
        return result.scalar_one_or_none()

    async def create_service(self, obj_in: FinansHizmetCreate) -> FinansHizmet:
        db_obj = FinansHizmet(**obj_in.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update_service(
        self, hizmet_id: int, obj_in: FinansHizmetUpdate
    ) -> Optional[FinansHizmet]:
        db_obj = await self.get_service(hizmet_id)
        if not db_obj:
            return None
        for key, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return db_obj

    async def delete_service(self, hizmet_id: int) -> bool:
        """
        Hizmeti siler.

        Geçmiş işlem kalemlerinde kullanılan hizmet silinemez — fatura dökümü bozulur.
        """
        from app.repositories.finance.models import FinansIslemSatir

        kullanim = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(FinansIslemSatir)
                    .where(FinansIslemSatir.hizmet_id == hizmet_id)
                )
            ).scalar()
            or 0
        )
        if kullanim:
            raise ValueError(
                f"Bu hizmet {kullanim} işlem kaleminde kullanılıyor, silinemez. "
                "Yeni işlemlerde çıkmaması için hizmeti pasife alın."
            )

        result = await self.session.execute(
            delete(FinansHizmet).where(FinansHizmet.id == hizmet_id)
        )
        return result.rowcount > 0

    # =========================================================================
    # KASALAR
    # =========================================================================
    async def get_accounts(self, aktif_only: bool = True) -> List[Kasa]:
        stmt = select(Kasa)
        if aktif_only:
            stmt = stmt.where(Kasa.aktif == True)
        stmt = stmt.order_by(Kasa.sira_no, Kasa.ad)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_account(self, kasa_id: int) -> Optional[Kasa]:
        result = await self.session.execute(select(Kasa).where(Kasa.id == kasa_id))
        return result.scalar_one_or_none()

    async def create_account(self, obj_in: KasaCreate) -> Kasa:
        db_obj = Kasa(**obj_in.model_dump())
        self.session.add(db_obj)
        await self.session.flush()
        return db_obj

    async def update_account(self, kasa_id: int, obj_in: KasaUpdate) -> Optional[Kasa]:
        db_obj = await self.get_account(kasa_id)
        if not db_obj:
            return None
        for key, value in obj_in.model_dump(exclude_unset=True).items():
            setattr(db_obj, key, value)
        await self.session.flush()
        return db_obj

    async def delete_account(self, kasa_id: int) -> bool:
        """
        Kasayı kapatır (pasife alır).

        Fiziksel silme yapılmaz: kasa hareketleri muhasebe defteridir ve
        silinirse paranın nereden gelip nereye gittiği izlenemez hâle gelir.
        Bakiyesi sıfır olmayan kasa kapatılamaz — önce bakiye başka kasaya
        aktarılmalıdır.
        """
        kasa = await self.get_account(kasa_id)
        if not kasa:
            return False

        bakiye = float(kasa.bakiye or 0)
        if abs(bakiye) >= 0.01:
            raise ValueError(
                f"Kasa bakiyesi {bakiye:.2f} ₺ olduğu için kapatılamaz. "
                "Önce bakiyeyi başka bir kasaya transfer edin."
            )

        if not kasa.aktif:
            return True

        kasa.aktif = False
        await self.session.flush()
        return True

    async def update_account_balance(
        self, kasa_id: int, tutar: float, hareket_tipi: str
    ) -> Optional[Kasa]:
        """Kasa bakiyesini günceller ve hareket kaydı oluşturur"""
        # Fetch with row-level lock (FOR UPDATE) to prevent race conditions during read-modify-write
        kasa_res = await self.session.execute(
            select(Kasa).where(Kasa.id == kasa_id).with_for_update()
        )
        kasa = kasa_res.scalar_one_or_none()
        
        if not kasa:
            return None

        onceki_bakiye = float(kasa.bakiye or 0)
        if hareket_tipi == "giris":
            kasa.bakiye = onceki_bakiye + tutar
        else:
            kasa.bakiye = onceki_bakiye - tutar

        sonraki_bakiye = float(kasa.bakiye)

        hareket = KasaHareket(
            kasa_id=kasa_id,
            hareket_tipi=hareket_tipi,
            tutar=tutar,
            onceki_bakiye=onceki_bakiye,
            sonraki_bakiye=sonraki_bakiye,
        )
        self.session.add(hareket)
        await self.session.flush()
        return kasa

    async def transfer_between_accounts(
        self, kaynak_id: int, hedef_id: int, tutar: float, aciklama: str = None
    ) -> Optional[dict]:
        """Kasalar arası transfer yapar"""
        if kaynak_id == hedef_id:
            raise ValueError("Kaynak ve hedef kasa aynı olamaz.")
        if tutar <= 0:
            raise ValueError("Transfer tutarı sıfırdan büyük olmalıdır.")

        # Lock in a consistent order (smaller ID first) to prevent distributed deadlocks
        lock_order = sorted([kaynak_id, hedef_id])

        locked_accounts = {}
        for k_id in lock_order:
            res = await self.session.execute(
                select(Kasa).where(Kasa.id == k_id).with_for_update()
            )
            locked_accounts[k_id] = res.scalar_one_or_none()

        kaynak = locked_accounts.get(kaynak_id)
        hedef = locked_accounts.get(hedef_id)

        if not kaynak or not hedef:
            return None

        if float(kaynak.bakiye or 0) < tutar:
            raise ValueError(
                f"{kaynak.ad} kasasında yeterli bakiye yok "
                f"(mevcut: {float(kaynak.bakiye or 0):.2f} ₺)."
            )

        # Source exit
        k_onceki = float(kaynak.bakiye or 0)
        kaynak.bakiye = k_onceki - tutar
        self.session.add(
            KasaHareket(
                kasa_id=kaynak_id,
                hareket_tipi="cikis",
                tutar=tutar,
                onceki_bakiye=k_onceki,
                sonraki_bakiye=float(kaynak.bakiye),
                aciklama=f"Transfer: {hedef.ad}'a gönderildi. {aciklama or ''}",
            )
        )

        # Target entry
        h_onceki = float(hedef.bakiye or 0)
        hedef.bakiye = h_onceki + tutar
        self.session.add(
            KasaHareket(
                kasa_id=hedef_id,
                hareket_tipi="giris",
                tutar=tutar,
                onceki_bakiye=h_onceki,
                sonraki_bakiye=float(hedef.bakiye),
                aciklama=f"Transfer: {kaynak.ad}'dan alındı. {aciklama or ''}",
            )
        )

        await self.session.flush()
        # Denetim kaydına yazılabilmesi için sonuç bakiyelerini de döndür
        return {
            "kaynak_kasa": kaynak.ad,
            "hedef_kasa": hedef.ad,
            "tutar": tutar,
            "kaynak_onceki_bakiye": k_onceki,
            "kaynak_sonraki_bakiye": float(kaynak.bakiye),
            "hedef_onceki_bakiye": h_onceki,
            "hedef_sonraki_bakiye": float(hedef.bakiye),
        }

    async def get_account_movements(
        self,
        kasa_id: int,
        skip: int = 0,
        limit: int = 50,
        start_date=None,
        end_date=None,
    ) -> List[KasaHareket]:
        """Kasa hareketlerini tarihe göre azalan sırada, sayfalı döner."""
        filters = [KasaHareket.kasa_id == kasa_id]
        if start_date:
            filters.append(KasaHareket.tarih >= start_date)
        if end_date:
            filters.append(KasaHareket.tarih <= end_date)

        stmt = (
            select(KasaHareket)
            .where(and_(*filters))
            .order_by(KasaHareket.tarih.desc(), KasaHareket.id.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_aylik_ozet(self, yil: int) -> List[dict]:
        """Aylık finansal özet verilerini getirir"""
        from sqlalchemy import func, extract

        # Gelirler
        gelir_stmt = (
            select(
                extract("month", FinansIslem.tarih).label("ay"),
                func.sum(FinansIslem.net_tutar).label("toplam"),
            )
            .where(
                and_(
                    FinansIslem.islem_tipi == "gelir",
                    extract("year", FinansIslem.tarih) == yil,
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
            .group_by(extract("month", FinansIslem.tarih))
        )

        # Giderler
        gider_stmt = (
            select(
                extract("month", FinansIslem.tarih).label("ay"),
                func.sum(FinansIslem.net_tutar).label("toplam"),
            )
            .where(
                and_(
                    FinansIslem.islem_tipi == "gider",
                    extract("year", FinansIslem.tarih) == yil,
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                )
            )
            .group_by(extract("month", FinansIslem.tarih))
        )

        gelir_res = await self.session.execute(gelir_stmt)
        gider_res = await self.session.execute(gider_stmt)

        gelirler = {int(r.ay): float(r.toplam) for r in gelir_res.all()}
        giderler = {int(r.ay): float(r.toplam) for r in gider_res.all()}

        ay_adlari = [
            "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
            "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
        ]

        result = []
        for i in range(1, 13):
            g = gelirler.get(i, 0)
            gi = giderler.get(i, 0)
            result.append({
                "yil": yil,
                "ay": i,
                "ay_adi": ay_adlari[i - 1],
                "gelir": g,
                "gider": gi,
                "net": g - gi
            })

        return result
