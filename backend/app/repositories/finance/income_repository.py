from typing import List, Optional
from uuid import UUID
from datetime import date, datetime
from sqlalchemy import select, func, and_, case, update, delete, DateTime
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansIslem,
    FinansIslemSatir,
    FinansOdeme,
    FinansKategori,
    Kasa,
    Firma,
)
from app.repositories.patient.models import Hasta
from app.schemas.finance import FinansIslemCreate
from app.core.user_context import UserContext
from app.core.audit import audited


class IncomeRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def generate_referans_kodu(self) -> str:
        yil = datetime.now().year
        result = await self.session.execute(
            select(func.max(FinansIslem.id)).where(
                and_(
                    FinansIslem.islem_tipi == "gelir",
                    func.extract("year", FinansIslem.created_at) == yil,
                )
            )
        )
        last_id = result.scalar() or 0
        return f"GEL-{yil}-{(last_id + 1):05d}"

    @audited(action="FINANCE_VIEW", resource_type="patient", id_arg_name="patient_id")
    async def get_patient_transactions(self, patient_id: UUID) -> List[FinansIslem]:
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar), 
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id, FinansIslem.is_deleted == False
                )
            )
            .order_by(FinansIslem.tarih.desc())
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def search_transactions(
        self,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        islem_tipi: Optional[str] = None,
        durum: Optional[str] = None,
        kategori_id: Optional[int] = None,
        hasta_id: Optional[UUID] = None,
        firma_id: Optional[int] = None,
        kasa_id: Optional[int] = None,
        referans: Optional[str] = None,
        vade_gecmis: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[dict], int]:
        """
        Finans işlemlerini filtreli ve sayfalı olarak getirir.

        FinansIslemListResponse ile uyumlu sözlükler döner: hasta adı, kategori adı
        ve ödenen/kalan tutarlar tek sorguda hesaplanır (N+1 yok).
        """
        # Her işlem için ödeme özeti: toplam tutar, adet, yöntem ve kasa
        paid_subq = (
            select(
                FinansOdeme.islem_id.label("islem_id"),
                func.sum(FinansOdeme.tutar).label("total_paid"),
                func.count(FinansOdeme.id).label("odeme_sayisi"),
                func.min(FinansOdeme.odeme_yontemi).label("ilk_yontem"),
                func.min(FinansOdeme.kasa_id).label("odeme_kasa_id"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )

        filters = [FinansIslem.is_deleted == False]
        if start_date:
            filters.append(FinansIslem.tarih >= start_date)
        if end_date:
            filters.append(FinansIslem.tarih <= end_date)
        if islem_tipi:
            filters.append(FinansIslem.islem_tipi == islem_tipi)
        if durum:
            filters.append(FinansIslem.durum == durum)
        if kategori_id is not None:
            filters.append(FinansIslem.kategori_id == kategori_id)
        if hasta_id is not None:
            filters.append(FinansIslem.hasta_id == hasta_id)
        if firma_id is not None:
            filters.append(FinansIslem.firma_id == firma_id)
        if kasa_id is not None:
            filters.append(FinansIslem.kasa_id == kasa_id)
        if referans:
            filters.append(FinansIslem.referans_kodu.ilike(f"%{referans}%"))

        odenen = func.coalesce(paid_subq.c.total_paid, 0)
        if vade_gecmis:
            # Vadesi geçmiş = vade dolmuş VE tamamı henüz tahsil edilmemiş
            filters.extend(
                [
                    FinansIslem.vade_tarihi.isnot(None),
                    FinansIslem.vade_tarihi < date.today(),
                    FinansIslem.durum != "iptal",
                    odenen < FinansIslem.net_tutar,
                ]
            )

        where_clause = and_(*filters)

        # Toplam kayıt sayısı (sayfalamadan bağımsız)
        total = int(
            (
                await self.session.execute(
                    select(func.count())
                    .select_from(FinansIslem)
                    .outerjoin(paid_subq, paid_subq.c.islem_id == FinansIslem.id)
                    .where(where_clause)
                )
            ).scalar()
            or 0
        )

        stmt = (
            select(
                FinansIslem.id,
                FinansIslem.referans_kodu,
                FinansIslem.hasta_id,
                FinansIslem.tarih,
                FinansIslem.islem_tipi,
                FinansIslem.durum,
                FinansIslem.tutar,
                FinansIslem.net_tutar,
                FinansIslem.aciklama,
                FinansIslem.vade_tarihi,
                FinansIslem.doktor,
                FinansIslem.created_at,
                Hasta.ad.label("hasta_ad"),
                Hasta.soyad.label("hasta_soyad"),
                FinansKategori.ad.label("kategori_adi"),
                Kasa.ad.label("kasa_adi"),
                Firma.ad.label("firma_adi"),
                odenen.label("odenen_tutar"),
                func.coalesce(paid_subq.c.odeme_sayisi, 0).label("odeme_sayisi"),
                paid_subq.c.ilk_yontem.label("ilk_yontem"),
            )
            .select_from(FinansIslem)
            .outerjoin(Hasta, Hasta.id == FinansIslem.hasta_id)
            .outerjoin(FinansKategori, FinansKategori.id == FinansIslem.kategori_id)
            .outerjoin(paid_subq, paid_subq.c.islem_id == FinansIslem.id)
            # Kasa adı: ödemenin kasası varsa o, yoksa işlemin kasası
            .outerjoin(
                Kasa,
                Kasa.id == func.coalesce(paid_subq.c.odeme_kasa_id, FinansIslem.kasa_id),
            )
            .outerjoin(Firma, Firma.id == FinansIslem.firma_id)
            .where(where_clause)
            .order_by(FinansIslem.tarih.desc(), FinansIslem.id.desc())
            .offset(skip)
            .limit(limit)
        )

        rows = (await self.session.execute(stmt)).all()

        items: List[dict] = []
        for r in rows:
            net = float(r.net_tutar or 0)
            paid = float(r.odenen_tutar or 0)
            hasta_adi = (
                f"{r.hasta_ad} {r.hasta_soyad}".strip()
                if r.hasta_ad or r.hasta_soyad
                else None
            )
            odeme_sayisi = int(r.odeme_sayisi or 0)
            items.append(
                {
                    "id": r.id,
                    "referans_kodu": r.referans_kodu,
                    "hasta_id": r.hasta_id,
                    "hasta_adi": hasta_adi,
                    "tarih": r.tarih,
                    "islem_tipi": r.islem_tipi,
                    "durum": r.durum,
                    "tutar": float(r.tutar or 0),
                    "net_tutar": net,
                    "aciklama": r.aciklama,
                    "vade_tarihi": r.vade_tarihi,
                    "kategori_adi": r.kategori_adi,
                    "kasa_adi": r.kasa_adi,
                    "firma_adi": r.firma_adi,
                    "doktor": r.doktor,
                    "odenen_tutar": paid,
                    "kalan_tutar": round(net - paid, 2),
                    "odeme_sayisi": odeme_sayisi,
                    # Tek ödeme varsa yöntemi göster; çoklu ödemede belirsiz
                    "odeme_yontemi": r.ilk_yontem if odeme_sayisi == 1 else None,
                    "created_at": r.created_at,
                }
            )

        return items, total

    async def get_transaction(self, tx_id: int) -> Optional[FinansIslem]:
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar), 
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(and_(FinansIslem.id == tx_id, FinansIslem.is_deleted == False))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_paid_total(self, tx_id: int) -> float:
        """İşleme yapılmış toplam tahsilat."""
        stmt = select(func.coalesce(func.sum(FinansOdeme.tutar), 0)).where(
            FinansOdeme.islem_id == tx_id
        )
        return float((await self.session.execute(stmt)).scalar() or 0)

    async def add_payment(self, tx_id: int, odeme_in) -> FinansOdeme:
        """
        Mevcut bir işleme ödeme ekler.

        Kasa bakiyesini günceller, hareket kaydı üretir, taksitli ise taksit
        planını oluşturur ve tahsilat tamamlandıysa işlem durumunu kapatır.
        """
        from app.repositories.finance.models import KasaHareket, FinansTaksit

        tx = await self.get_transaction(tx_id)
        if not tx:
            raise ValueError("İşlem bulunamadı")
        if tx.durum == "iptal":
            raise ValueError("İptal edilmiş işleme ödeme eklenemez")

        tutar = float(odeme_in.tutar)
        if tutar <= 0:
            raise ValueError("Ödeme tutarı sıfırdan büyük olmalıdır")

        net = float(tx.net_tutar or 0)
        onceden_odenen = await self.get_paid_total(tx_id)
        if onceden_odenen + tutar > net + 0.01:
            kalan = round(net - onceden_odenen, 2)
            raise ValueError(
                f"Ödeme tutarı kalan borcu aşıyor. Kalan: {kalan:.2f} ₺"
            )

        odeme = FinansOdeme(
            islem_id=tx_id,
            kasa_id=odeme_in.kasa_id,
            odeme_yontemi=odeme_in.odeme_yontemi,
            tutar=tutar,
            odeme_tarihi=odeme_in.odeme_tarihi,
            taksit_sayisi=odeme_in.taksit_sayisi or 1,
        )
        self.session.add(odeme)
        await self.session.flush()

        if odeme.kasa_id:
            kasa_res = await self.session.execute(
                select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update()
            )
            kasa = kasa_res.scalar_one_or_none()
            if not kasa:
                raise ValueError("Seçilen kasa bulunamadı")

            onceki_bakiye = float(kasa.bakiye or 0)
            # Gelir tahsilatı kasaya girer, gider ödemesi kasadan çıkar
            giris = tx.islem_tipi == "gelir"
            kasa.bakiye = onceki_bakiye + tutar if giris else onceki_bakiye - tutar

            self.session.add(
                KasaHareket(
                    kasa_id=kasa.id,
                    hareket_tipi="giris" if giris else "cikis",
                    tutar=tutar,
                    onceki_bakiye=onceki_bakiye,
                    sonraki_bakiye=float(kasa.bakiye),
                    aciklama=f"Ref: {tx.referans_kodu} ek tahsilat",
                    islem_id=tx_id,
                )
            )

        if odeme.taksit_sayisi and odeme.taksit_sayisi > 1:
            from dateutil.relativedelta import relativedelta

            adet = int(odeme.taksit_sayisi)
            base = round(tutar / adet, 2)
            son = round(tutar - base * (adet - 1), 2)
            for i in range(1, adet + 1):
                self.session.add(
                    FinansTaksit(
                        odeme_id=odeme.id,
                        taksit_no=i,
                        tutar=son if i == adet else base,
                        vade_tarihi=odeme.odeme_tarihi + relativedelta(months=i),
                        durum="bekliyor",
                    )
                )

        await self.session.flush()
        await self.sync_transaction_status(tx_id)
        return odeme

    async def delete_payment(self, tx_id: int, odeme_id: int) -> bool:
        """
        İşleme ait bir ödemeyi siler ve kasa etkisini geri alır.

        Yanlış girilen tahsilatı düzeltmenin yolu budur; aksi hâlde tüm işlemi
        iptal edip yeniden kurmak gerekirdi.
        """
        from app.repositories.finance.models import KasaHareket, FinansTaksit

        tx = await self.get_transaction(tx_id)
        if not tx:
            raise ValueError("İşlem bulunamadı")
        if tx.durum == "iptal":
            raise ValueError("İptal edilmiş işlemin ödemesi düzenlenemez")

        odeme = (
            await self.session.execute(
                select(FinansOdeme).where(
                    and_(FinansOdeme.id == odeme_id, FinansOdeme.islem_id == tx_id)
                )
            )
        ).scalar_one_or_none()
        if not odeme:
            return False

        tutar = float(odeme.tutar or 0)

        # Kasa etkisini ters çevir
        if odeme.kasa_id:
            kasa_res = await self.session.execute(
                select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update()
            )
            kasa = kasa_res.scalar_one_or_none()
            if kasa:
                onceki_bakiye = float(kasa.bakiye or 0)
                # Gelir tahsilatı geri alınırsa kasadan çıkar, gider ödemesi geri gelir
                geri_cikis = tx.islem_tipi == "gelir"
                kasa.bakiye = (
                    onceki_bakiye - tutar if geri_cikis else onceki_bakiye + tutar
                )
                self.session.add(
                    KasaHareket(
                        kasa_id=kasa.id,
                        hareket_tipi="cikis" if geri_cikis else "giris",
                        tutar=tutar,
                        onceki_bakiye=onceki_bakiye,
                        sonraki_bakiye=float(kasa.bakiye),
                        aciklama=f"Ref: {tx.referans_kodu} tahsilat iptali",
                        islem_id=tx_id,
                    )
                )

        # Taksit planı ödemeye bağlı, birlikte gider
        await self.session.execute(
            delete(FinansTaksit).where(FinansTaksit.odeme_id == odeme_id)
        )
        await self.session.delete(odeme)
        await self.session.flush()
        await self.sync_transaction_status(tx_id)
        return True

    async def collect_installment(
        self, taksit_id: int, tahsil_tarihi: Optional[date] = None
    ):
        """
        Taksiti tahsil edildi olarak işaretler.

        Para hareketi oluşturmaz: taksitli ödemede tutar kasaya ödeme kaydı
        sırasında zaten girmiştir (banka peşin öder). Bu işlem yalnızca
        müşterinin taksit ödeme takibini tutar.
        """
        from app.repositories.finance.models import FinansTaksit

        taksit = (
            await self.session.execute(
                select(FinansTaksit).where(FinansTaksit.id == taksit_id)
            )
        ).scalar_one_or_none()
        if not taksit:
            return None

        if taksit.durum == "tahsil_edildi":
            return taksit

        taksit.durum = "tahsil_edildi"
        taksit.tahsil_tarihi = tahsil_tarihi or date.today()
        await self.session.flush()
        return taksit

    async def uncollect_installment(self, taksit_id: int):
        """Taksit tahsilatını geri alır (yanlış işaretleme düzeltmesi)."""
        from app.repositories.finance.models import FinansTaksit

        taksit = (
            await self.session.execute(
                select(FinansTaksit).where(FinansTaksit.id == taksit_id)
            )
        ).scalar_one_or_none()
        if not taksit:
            return None

        taksit.durum = "bekliyor"
        taksit.tahsil_tarihi = None
        await self.session.flush()
        return taksit

    async def sync_transaction_status(self, tx_id: int) -> Optional[str]:
        """
        Tahsilat durumuna göre işlem durumunu günceller.

        Tamamı tahsil edildiyse 'tamamlandi', aksi hâlde 'bekliyor'.
        İptal edilmiş işlemlere dokunulmaz.
        """
        tx = await self.get_transaction(tx_id)
        if not tx or tx.durum == "iptal":
            return None

        net = float(tx.net_tutar or 0)
        odenen = await self.get_paid_total(tx_id)
        yeni_durum = "tamamlandi" if odenen >= net - 0.01 else "bekliyor"

        if tx.durum != yeni_durum:
            await self.session.execute(
                update(FinansIslem)
                .where(FinansIslem.id == tx_id)
                .values(durum=yeni_durum)
            )
            await self.session.flush()
        return yeni_durum

    async def get_patient_balance(self, patient_id: UUID) -> dict:
        """Calculates patient balance status."""
        # Debt
        borc_stmt = select(func.sum(FinansIslem.net_tutar)).where(
            and_(
                FinansIslem.hasta_id == patient_id,
                FinansIslem.islem_tipi == "gelir",
                FinansIslem.durum != "iptal",
                FinansIslem.is_deleted == False,
            )
        )
        # Payment
        odeme_stmt = (
            select(func.sum(FinansOdeme.tutar))
            .join(FinansIslem)
            .where(
                and_(
                    FinansIslem.hasta_id == patient_id,
                    FinansIslem.durum != "iptal",
                    FinansIslem.is_deleted == False,
                )
            )
        )

        borc = float((await self.session.execute(borc_stmt)).scalar() or 0)
        odeme = float((await self.session.execute(odeme_stmt)).scalar() or 0)

        return {
            "hasta_id": patient_id,
            "toplam_borc": borc,
            "toplam_odeme": odeme,
            "bakiye": borc - odeme,
        }

    async def get_debtor_patients(
        self, min_borc: float = 0, skip: int = 0, limit: int = 100
    ) -> List[dict]:
        """
        Bakiyesi min_borc üzerinde olan hastaları döner.

        Bakiye = tahakkuk eden gelir - tahsil edilen ödeme. Ödemeler hesaba
        katılmazsa liste brüt faturayı gösterir, bu yüzden ödeme toplamı da
        aynı sorguda çıkarılır.
        """
        borc_subq = (
            select(
                FinansIslem.hasta_id.label("hasta_id"),
                func.sum(FinansIslem.net_tutar).label("total_debt"),
                func.max(FinansIslem.tarih).label("son_islem_tarihi"),
            )
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.durum != "iptal",
                    FinansIslem.hasta_id.isnot(None),
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )

        odeme_subq = (
            select(
                FinansIslem.hasta_id.label("hasta_id"),
                func.sum(FinansOdeme.tutar).label("total_paid"),
            )
            .select_from(FinansIslem)
            .join(FinansOdeme, FinansOdeme.islem_id == FinansIslem.id)
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.durum != "iptal",
                    FinansIslem.hasta_id.isnot(None),
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )

        # Vadesi geçmiş, henüz kapanmamış tahakkuklar
        vade_subq = (
            select(
                FinansIslem.hasta_id.label("hasta_id"),
                func.sum(FinansIslem.net_tutar).label("overdue_debt"),
            )
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.durum != "iptal",
                    FinansIslem.hasta_id.isnot(None),
                    FinansIslem.vade_tarihi.isnot(None),
                    FinansIslem.vade_tarihi < date.today(),
                )
            )
            .group_by(FinansIslem.hasta_id)
            .subquery()
        )

        odenen = func.coalesce(odeme_subq.c.total_paid, 0)
        bakiye = borc_subq.c.total_debt - odenen

        stmt = (
            select(
                Hasta.id,
                Hasta.ad,
                Hasta.soyad,
                borc_subq.c.total_debt,
                borc_subq.c.son_islem_tarihi,
                odenen.label("total_paid"),
                func.coalesce(vade_subq.c.overdue_debt, 0).label("overdue_debt"),
                bakiye.label("bakiye"),
            )
            .join(borc_subq, Hasta.id == borc_subq.c.hasta_id)
            .outerjoin(odeme_subq, Hasta.id == odeme_subq.c.hasta_id)
            .outerjoin(vade_subq, Hasta.id == vade_subq.c.hasta_id)
            .where(bakiye > min_borc)
            .order_by(bakiye.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return [
            {
                "hasta_id": r.id,
                "hasta_adi": f"{r.ad or ''} {r.soyad or ''}".strip() or None,
                "toplam_borc": float(r.total_debt or 0),
                "toplam_odeme": float(r.total_paid or 0),
                "bakiye": float(r.bakiye or 0),
                "vadesi_gecmis_borc": float(r.overdue_debt or 0),
                "son_islem_tarihi": r.son_islem_tarihi,
            }
            for r in result.all()
        ]

    @audited(action="FINANCE_CREATE", resource_type="patient")
    async def create_income_transaction(self, obj_in: FinansIslemCreate) -> FinansIslem:
        from app.repositories.finance.models import KasaHareket
        
        ref = await self.generate_referans_kodu()
        data = obj_in.model_dump(exclude={"satirlar", "odemeler"})
        data["referans_kodu"] = ref
        data["islem_tipi"] = "gelir"
        
        # Remove fields that do not exist on the FinansIslem SQLAlchemy model
        data.pop("notlar", None)

        db_tx = FinansIslem(**data)
        if self.context:
            db_tx.created_by = self.context.user_id
        self.session.add(db_tx)
        await self.session.flush()

        # Satirlar
        for s in obj_in.satirlar:
            s_data = s.model_dump()
            valid_satir = {
                "hizmet_id": s_data.get("hizmet_id"),
                "aciklama": s_data.get("hizmet_adi", ""),
                "miktar": s_data.get("adet", 1),
                "birim_fiyat": s_data.get("birim_fiyat", 0),
                "toplam_tutar": s_data.get("toplam", 0),
            }
            self.session.add(FinansIslemSatir(islem_id=db_tx.id, **valid_satir))

        # Odemeler
        for o in obj_in.odemeler:
            o_data = o.model_dump()
            valid_odeme = {
                "kasa_id": o_data.get("kasa_id"),
                "odeme_yontemi": o_data.get("odeme_yontemi"),
                "tutar": o_data.get("tutar"),
                "odeme_tarihi": o_data.get("odeme_tarihi"),
                "taksit_sayisi": o_data.get("taksit_sayisi", 1)
            }
            odeme = FinansOdeme(islem_id=db_tx.id, **valid_odeme)
            self.session.add(odeme)
            await self.session.flush()

            if odeme.kasa_id:
                # Get Kasa with row-level lock
                kasa_res = await self.session.execute(select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update())
                kasa = kasa_res.scalar_one()
                onceki_bakiye = float(kasa.bakiye or 0)
                
                # Add to Kasa (Income)
                kasa.bakiye = onceki_bakiye + float(odeme.tutar)
                
                # Record Movement
                hareket = KasaHareket(
                    kasa_id=kasa.id,
                    hareket_tipi="giris",
                    tutar=odeme.tutar,
                    onceki_bakiye=onceki_bakiye,
                    sonraki_bakiye=float(kasa.bakiye),
                    aciklama=f"Ref: {ref} gelir işlemi",
                    islem_id=db_tx.id
                )
                self.session.add(hareket)

            # Generate Installments if taksit_sayisi > 1
            if hasattr(odeme, "taksit_sayisi") and odeme.taksit_sayisi and odeme.taksit_sayisi > 1:
                from dateutil.relativedelta import relativedelta
                from app.repositories.finance.models import FinansTaksit

                taksit_sayisi = int(odeme.taksit_sayisi)
                base_tutar = float(odeme.tutar) / taksit_sayisi
                base_tutar = round(base_tutar, 2)
                
                # Handling round-off error for the last installment
                remainder = round(float(odeme.tutar) - (base_tutar * (taksit_sayisi - 1)), 2)

                for i in range(1, taksit_sayisi + 1):
                    vade = odeme.odeme_tarihi + relativedelta(months=i)
                    taksit_tutari = remainder if i == taksit_sayisi else base_tutar
                    
                    taksit = FinansTaksit(
                        odeme_id=odeme.id,
                        taksit_no=i,
                        tutar=taksit_tutari,
                        vade_tarihi=vade,
                        durum="bekliyor"
                    )
                    self.session.add(taksit)

        await self.session.flush()

        from sqlalchemy.orm import selectinload
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar),
                selectinload(FinansIslem.odemeler).selectinload(FinansOdeme.taksitler)
            )
            .where(FinansIslem.id == db_tx.id)
        )
        res = await self.session.execute(stmt)
        return res.scalar_one()
    @audited(
        action="FINANCE_DELETE_ALL", resource_type="patient", id_arg_name="patient_id"
    )
    async def delete_patient_finance_data(self, patient_id: UUID) -> bool:
        """Logical delete of all finance data for a patient."""
        stmt = (
            update(FinansIslem)
            .where(FinansIslem.hasta_id == patient_id)
            .values(
                is_deleted=True,
                updated_by=self.context.user_id if self.context else None,
            )
        )
        await self.session.execute(stmt)
        await self.session.flush()
        return True

    async def get_financial_summary(
        self, start_date: Optional[date] = None, end_date: Optional[date] = None
    ) -> dict:
        """Calculates general financial summary."""
        # 1. Base filters
        base_filter = [FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"]
        if start_date:
            base_filter.append(FinansIslem.tarih >= start_date)
        if end_date:
            base_filter.append(FinansIslem.tarih <= end_date)

        # 2. Dönem ve bugün toplamları — koşullu toplama ile TEK sorgu
        today = date.today()
        bugun_kosulu = FinansIslem.tarih == today

        def _toplam(tip: str, ek=None):
            kosul = FinansIslem.islem_tipi == tip
            if ek is not None:
                kosul = and_(kosul, ek)
            return func.coalesce(
                func.sum(case((kosul, FinansIslem.net_tutar), else_=0)), 0
            )

        stmt_totals = select(
            _toplam("gelir").label("total_income"),
            _toplam("gider").label("total_expense"),
            _toplam("gelir", bugun_kosulu).label("today_income"),
            _toplam("gider", bugun_kosulu).label("today_expense"),
        ).where(and_(*base_filter))

        totals = (await self.session.execute(stmt_totals)).fetchone()

        # 3. Tahsil edilen toplam
        stmt_collected = (
            select(func.coalesce(func.sum(FinansOdeme.tutar), 0))
            .join(FinansIslem, FinansIslem.id == FinansOdeme.islem_id)
            .where(and_(FinansIslem.is_deleted == False, FinansIslem.durum != "iptal"))
        )
        if start_date:
            stmt_collected = stmt_collected.where(
                FinansOdeme.odeme_tarihi >= start_date
            )
        if end_date:
            stmt_collected = stmt_collected.where(FinansOdeme.odeme_tarihi <= end_date)

        collected = float((await self.session.execute(stmt_collected)).scalar() or 0)

        income = float(totals.total_income or 0)
        expense = float(totals.total_expense or 0)

        return {
            "toplam_gelir": income,
            "toplam_gider": expense,
            "net_bakiye": income - expense,
            "bekleyen_tahsilat": income - collected if income > collected else 0,
            "vadesi_gecmis_islem_sayisi": await self.count_overdue_transactions(),
            "bugun_gelir": float(totals.today_income or 0),
            "bugun_gider": float(totals.today_expense or 0),
        }

    def _overdue_filter(self):
        """Vadesi geçmiş ve tamamı tahsil edilmemiş gelir işlemlerinin ortak filtresi."""
        paid_subq = (
            select(
                FinansOdeme.islem_id.label("islem_id"),
                func.sum(FinansOdeme.tutar).label("total_paid"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )
        condition = and_(
            FinansIslem.is_deleted == False,
            FinansIslem.islem_tipi == "gelir",
            FinansIslem.durum != "iptal",
            FinansIslem.vade_tarihi.isnot(None),
            FinansIslem.vade_tarihi < date.today(),
            # Hiç ödeme yok ya da toplam ödeme net tutarın altında
            func.coalesce(paid_subq.c.total_paid, 0) < FinansIslem.net_tutar,
        )
        return paid_subq, condition

    async def get_category_breakdown(
        self,
        islem_tipi: str = "gelir",
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
    ) -> List[dict]:
        """
        Kategori bazlı toplam ve işlem sayısı.

        Kategorisiz kayıtlar da tek satırda toplanır; aksi hâlde rapor
        toplamı genel toplamı tutmaz.
        """
        filters = [
            FinansIslem.is_deleted == False,
            FinansIslem.durum != "iptal",
            FinansIslem.islem_tipi == islem_tipi,
        ]
        if start_date:
            filters.append(FinansIslem.tarih >= start_date)
        if end_date:
            filters.append(FinansIslem.tarih <= end_date)

        stmt = (
            select(
                FinansKategori.id.label("kategori_id"),
                FinansKategori.ad.label("kategori_adi"),
                FinansKategori.renk.label("renk"),
                func.coalesce(func.sum(FinansIslem.net_tutar), 0).label("toplam"),
                func.count(FinansIslem.id).label("islem_sayisi"),
            )
            .select_from(FinansIslem)
            .outerjoin(FinansKategori, FinansKategori.id == FinansIslem.kategori_id)
            .where(and_(*filters))
            .group_by(FinansKategori.id, FinansKategori.ad, FinansKategori.renk)
            .order_by(func.coalesce(func.sum(FinansIslem.net_tutar), 0).desc())
        )

        rows = (await self.session.execute(stmt)).all()
        toplam_genel = sum(float(r.toplam or 0) for r in rows) or 1.0

        return [
            {
                "kategori_id": r.kategori_id,
                "kategori_adi": r.kategori_adi or "Kategorisiz",
                "renk": r.renk,
                "toplam": float(r.toplam or 0),
                "islem_sayisi": int(r.islem_sayisi or 0),
                "yuzde": round(float(r.toplam or 0) / toplam_genel * 100, 1),
            }
            for r in rows
        ]

    async def get_aging_report(self) -> List[dict]:
        """
        Tahsilat yaşlandırma: açık alacakların vade yaşına göre dağılımı.

        Nakit akışı planlamasının temeli — 90+ gün kovasındaki tutar
        tahsil edilebilirliği düşen alacağı gösterir.
        """
        paid_subq = (
            select(
                FinansOdeme.islem_id.label("islem_id"),
                func.sum(FinansOdeme.tutar).label("total_paid"),
            )
            .group_by(FinansOdeme.islem_id)
            .subquery()
        )
        odenen = func.coalesce(paid_subq.c.total_paid, 0)
        kalan = FinansIslem.net_tutar - odenen

        # Vadesi yoksa işlem tarihi esas alınır
        vade = func.coalesce(FinansIslem.vade_tarihi, FinansIslem.tarih)
        gun = func.extract("day", func.now() - func.cast(vade, DateTime))

        kova = case(
            (gun < 0, "vadesi_gelmedi"),
            (gun <= 30, "0_30"),
            (gun <= 60, "31_60"),
            (gun <= 90, "61_90"),
            else_="90_plus",
        ).label("kova")

        stmt = (
            select(
                kova,
                func.coalesce(func.sum(kalan), 0).label("tutar"),
                func.count(FinansIslem.id).label("islem_sayisi"),
            )
            .select_from(FinansIslem)
            .outerjoin(paid_subq, paid_subq.c.islem_id == FinansIslem.id)
            .where(
                and_(
                    FinansIslem.is_deleted == False,
                    FinansIslem.islem_tipi == "gelir",
                    FinansIslem.durum != "iptal",
                    kalan > 0,
                )
            )
            .group_by(kova)
        )

        rows = {r.kova: r for r in (await self.session.execute(stmt)).all()}

        etiketler = [
            ("vadesi_gelmedi", "Vadesi gelmedi"),
            ("0_30", "0-30 gün"),
            ("31_60", "31-60 gün"),
            ("61_90", "61-90 gün"),
            ("90_plus", "90+ gün"),
        ]
        # Boş kovalar da dönsün ki grafik ekseni sabit kalsın
        return [
            {
                "kova": anahtar,
                "etiket": etiket,
                "tutar": float(rows[anahtar].tutar) if anahtar in rows else 0.0,
                "islem_sayisi": int(rows[anahtar].islem_sayisi) if anahtar in rows else 0,
            }
            for anahtar, etiket in etiketler
        ]

    async def count_overdue_transactions(self) -> int:
        """Vadesi geçmiş işlem sayısını satırları yüklemeden sayar."""
        paid_subq, condition = self._overdue_filter()
        stmt = (
            select(func.count())
            .select_from(FinansIslem)
            .outerjoin(paid_subq, FinansIslem.id == paid_subq.c.islem_id)
            .where(condition)
        )
        return int((await self.session.execute(stmt)).scalar() or 0)

