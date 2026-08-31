from typing import Optional
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from sqlalchemy import select, func, and_, update, delete
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.models import (
    FinansIslem,
    FinansIslemSatir,
    FinansOdeme,
    FinansTaksit,
    KasaHareket,
    Kasa,
)
from app.schemas.finance import FinansIslemCreate
from app.core.user_context import UserContext


class IncomeTransactionMixin:
    session: AsyncSession
    context: Optional[UserContext]

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

    async def get_transaction(self, tx_id: int) -> Optional[FinansIslem]:
        stmt = (
            select(FinansIslem)
            .options(
                selectinload(FinansIslem.satirlar),
                selectinload(FinansIslem.odemeler).selectinload(
                    FinansOdeme.taksitler
                ),
            )
            .where(
                and_(FinansIslem.id == tx_id, FinansIslem.is_deleted == False)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def add_payment(self, tx_id: int, odeme_in) -> FinansOdeme:
        tx = await self.session.get(FinansIslem, tx_id)
        if not tx:
            raise ValueError("İşlem bulunamadı")
        if tx.durum == "iptal":
            raise ValueError("İptal edilmiş işleme ödeme eklenemez")

        kalan = await self._calculate_remaining(tx_id, tx.net_tutar)
        if odeme_in.tutar > (kalan + 0.01):
            raise ValueError(
                f"Ödeme tutarı ({odeme_in.tutar:.2f}) kalan borcu ({kalan:.2f}) aşamaz"
            )

        kasa = await self.session.get(Kasa, odeme_in.kasa_id)
        if not kasa:
            raise ValueError("Seçilen kasa bulunamadı")
        if not kasa.aktif:
            raise ValueError("Pasif kasaya ödeme yapılamaz")

        tarih = odeme_in.odeme_tarihi or date.today()
        bakiye_once = float(kasa.bakiye or 0)
        tutar = float(odeme_in.tutar)

        if tx.islem_tipi == "gelir":
            bakiye_sonra = bakiye_once + tutar
            hareket_tipi = "giris"
        else:
            bakiye_sonra = bakiye_once - tutar
            hareket_tipi = "cikis"

        kasa.bakiye = bakiye_sonra

        odeme = FinansOdeme(
            islem_id=tx_id,
            kasa_id=odeme_in.kasa_id,
            tutar=odeme_in.tutar,
            odeme_tarihi=tarih,
            odeme_yontemi=odeme_in.odeme_yontemi,
            dekont_no=odeme_in.dekont_no,
            notlar=odeme_in.notlar,
            created_by=self.context.user_id if self.context else None,
        )
        self.session.add(odeme)
        await self.session.flush()

        kasa_hareket = KasaHareket(
            kasa_id=odeme_in.kasa_id,
            islem_id=tx_id,
            tarih=tarih,
            hareket_tipi=hareket_tipi,
            tutar=odeme_in.tutar,
            bakiye_once=bakiye_once,
            bakiye_sonra=bakiye_sonra,
            aciklama=f"{tx.referans_no} nolu işlem tahsilatı ({odeme_in.odeme_yontemi})",
            created_by=self.context.user_id if self.context else None,
        )
        self.session.add(kasa_hareket)

        taksit_sayisi = getattr(odeme_in, "taksit_sayisi", 1) or 1
        if taksit_sayisi > 1:
            taksit_tutari = round(tutar / taksit_sayisi, 2)
            for i in range(taksit_sayisi):
                vade = tarih + relativedelta(months=i)
                self.session.add(
                    FinansTaksit(
                        odeme_id=odeme.id,
                        taksit_no=i + 1,
                        vade_tarihi=vade,
                        tutar=taksit_tutari,
                        durum="tahsil_edildi" if i == 0 else "bekliyor",
                        tahsil_tarihi=tarih if i == 0 else None,
                    )
                )

        await self.sync_transaction_status(tx_id)
        return odeme

    async def delete_payment(self, tx_id: int, odeme_id: int) -> bool:
        tx = await self.session.get(FinansIslem, tx_id)
        if not tx:
            raise ValueError("İşlem bulunamadı")
        if tx.durum == "iptal":
            raise ValueError("İptal edilmiş işlemden ödeme silinemez")

        odeme = await self.session.get(FinansOdeme, odeme_id)
        if not odeme or odeme.islem_id != tx_id:
            return False

        kasa = await self.session.get(Kasa, odeme.kasa_id)
        tutar = float(odeme.tutar)
        bakiye_once = float(kasa.bakiye or 0)

        if tx.islem_tipi == "gelir":
            bakiye_sonra = bakiye_once - tutar
            hareket_tipi = "cikis"
        else:
            bakiye_sonra = bakiye_once + tutar
            hareket_tipi = "giris"

        kasa.bakiye = bakiye_sonra

        ters_hareket = KasaHareket(
            kasa_id=odeme.kasa_id,
            islem_id=tx_id,
            tarih=date.today(),
            hareket_tipi=hareket_tipi,
            tutar=odeme.tutar,
            bakiye_once=bakiye_once,
            bakiye_sonra=bakiye_sonra,
            aciklama=f"{tx.referans_no} nolu tahsilat iptali / geri alma",
            created_by=self.context.user_id if self.context else None,
        )
        self.session.add(ters_hareket)

        await self.session.execute(
            delete(FinansTaksit).where(FinansTaksit.odeme_id == odeme_id)
        )
        await self.session.delete(odeme)
        await self.session.flush()

        await self.sync_transaction_status(tx_id)
        return True

    async def sync_transaction_status(self, tx_id: int) -> Optional[str]:
        tx = await self.session.get(FinansIslem, tx_id)
        if not tx or tx.durum == "iptal":
            return getattr(tx, "durum", None)

        res = await self.session.execute(
            select(func.coalesce(func.sum(FinansOdeme.tutar), 0)).where(
                FinansOdeme.islem_id == tx_id
            )
        )
        odenen = float(res.scalar() or 0)
        net = float(tx.net_tutar or 0)

        if odenen <= 0.009:
            yeni_durum = "bekliyor"
        elif odenen >= (net - 0.009):
            yeni_durum = "tamamlandi"
        else:
            yeni_durum = "kismi_odendi"

        if tx.durum != yeni_durum:
            tx.durum = yeni_durum
            await self.session.flush()

        return yeni_durum

    async def _calculate_remaining(self, tx_id: int, net_tutar: float) -> float:
        res = await self.session.execute(
            select(func.coalesce(func.sum(FinansOdeme.tutar), 0)).where(
                FinansOdeme.islem_id == tx_id
            )
        )
        paid = float(res.scalar() or 0)
        return max(0.0, round(float(net_tutar) - paid, 2))

    async def collect_installment(
        self, taksit_id: int, tahsil_tarihi: Optional[date] = None
    ):
        taksit = await self.session.get(FinansTaksit, taksit_id)
        if not taksit:
            return None
        taksit.durum = "tahsil_edildi"
        taksit.tahsil_tarihi = tahsil_tarihi or date.today()
        await self.session.flush()
        return taksit

    async def uncollect_installment(self, taksit_id: int):
        taksit = await self.session.get(FinansTaksit, taksit_id)
        if not taksit:
            return None
        taksit.durum = "bekliyor"
        taksit.tahsil_tarihi = None
        await self.session.flush()
        return taksit

    async def create_income_transaction(
        self, obj_in: FinansIslemCreate
    ) -> FinansIslem:
        referans_no = obj_in.referans_no or await self.generate_referans_kodu()

        brut = sum(
            float(s.birim_fiyat) * float(s.miktar) for s in obj_in.satirlar
        )
        toplam_indirim = sum(
            float(s.indirim_tutari or 0) for s in obj_in.satirlar
        )
        toplam_kdv = sum(float(s.kdv_tutari or 0) for s in obj_in.satirlar)
        net = (brut - toplam_indirim) + toplam_kdv

        islem = FinansIslem(
            referans_no=referans_no,
            islem_tipi="gelir",
            kategori_id=obj_in.kategori_id,
            hasta_id=obj_in.hasta_id,
            doktor_id=obj_in.doktor_id,
            tarih=obj_in.tarih or date.today(),
            vade_tarihi=obj_in.vade_tarihi,
            durum="bekliyor",
            brut_tutar=brut,
            indirim_tutari=toplam_indirim,
            kdv_tutari=toplam_kdv,
            net_tutar=net,
            aciklama=obj_in.aciklama,
            created_by=self.context.user_id if self.context else None,
        )
        self.session.add(islem)
        await self.session.flush()

        for s in obj_in.satirlar:
            satir_net = (
                float(s.birim_fiyat) * float(s.miktar)
                - float(s.indirim_tutari or 0)
                + float(s.kdv_tutari or 0)
            )
            satir = FinansIslemSatir(
                islem_id=islem.id,
                hizmet_id=s.hizmet_id,
                aciklama=s.aciklama,
                miktar=s.miktar,
                birim=s.birim,
                birim_fiyat=s.birim_fiyat,
                kdv_orani=s.kdv_orani,
                kdv_tutari=s.kdv_tutari,
                indirim_orani=s.indirim_orani,
                indirim_tutari=s.indirim_tutari,
                toplam_tutar=satir_net,
            )
            self.session.add(satir)

        for o in obj_in.odemeler or []:
            await self.add_payment(islem.id, o)

        return await self.get_transaction(islem.id)
