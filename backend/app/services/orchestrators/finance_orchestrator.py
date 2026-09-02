from typing import Any, Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.finance.accounts_repository import AccountsRepository
from app.repositories.finance.income_repository import IncomeRepository
from app.repositories.finance.expense_repository import ExpenseRepository
from app.repositories.patient.demographics_repository import DemographicsRepository
from app.core.user_context import UserContext
from app.repositories.finance.models import FinansIslem
from sqlalchemy import update
from app.schemas.finance import FinansIslemCreate


class FinanceOrchestrator:
    def __init__(self, db: AsyncSession, context: Optional[UserContext] = None):
        self.db = db
        self.context = context
        self.accounts_repo = AccountsRepository(db, context)
        self.income_repo = IncomeRepository(db, context)
        self.expense_repo = ExpenseRepository(db, context)
        self.patient_repo = DemographicsRepository(db, context)

    async def get_patient_finance_summary(self, patient_id: UUID) -> dict:
        """
        Aggregates demographics from patient shard and financial stats.
        """
        # 1. Get patient info
        patient = await self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise ValueError(f"Patient {patient_id} not found")

        # 2. Get financial stats
        stats = await self.income_repo.get_patient_balance(patient_id)

        return {
            "patient_name": f"{patient.ad} {patient.soyad}",
            "tc_kimlik": patient.tc_kimlik,
            **stats,
        }

    async def create_transaction_safely(self, tx_data: dict) -> Any:
        """
        İşlemi oluşturmadan önce hasta varlığını ve tutar tutarlılığını doğrular.
        """
        if tx_data.get("hasta_id"):
            patient = await self.patient_repo.get_by_id(tx_data["hasta_id"])
            if not patient:
                raise ValueError("Referans verilen hasta kaydı bulunamadı")

        net = float(tx_data.get("net_tutar") or 0)
        if net <= 0:
            raise ValueError("İşlem tutarı sıfırdan büyük olmalıdır")

        odemeler = tx_data.get("odemeler") or []
        odeme_toplami = sum(float(o.get("tutar") or 0) for o in odemeler)
        if any(float(o.get("tutar") or 0) <= 0 for o in odemeler):
            raise ValueError("Ödeme tutarları sıfırdan büyük olmalıdır")
        if odeme_toplami > net + 0.01:
            raise ValueError(
                f"Ödemeler toplamı ({odeme_toplami:.2f} ₺) "
                f"işlem tutarını ({net:.2f} ₺) aşamaz"
            )

        if tx_data.get("islem_tipi") == "gider":
            tx = await self.expense_repo.create_expense_transaction(
                FinansIslemCreate(**tx_data)
            )
        else:
            tx = await self.income_repo.create_income_transaction(
                FinansIslemCreate(**tx_data)
            )

        await self.db.flush()
        # Tahsilat tam ise durumu kapat
        await self.income_repo.sync_transaction_status(tx.id)
        return await self.income_repo.get_transaction(tx.id)

    async def add_payment(self, tx_id: int, odeme_in) -> Any:
        """Mevcut işleme ödeme ekler ve güncel işlemi döner."""
        await self.income_repo.add_payment(tx_id, odeme_in)
        await self.db.flush()
        return await self.income_repo.get_transaction(tx_id)

    async def collect_bulk(
        self,
        patient_id: UUID,
        tutar: float,
        kasa_id: Optional[int],
        odeme_yontemi: str,
        odeme_tarihi,
    ) -> dict:
        """
        Hastanın açık borçlarına toplu tahsilat dağıtır.

        Dağıtım en eski vadeden başlar (FIFO): ön masada hasta tek tutar
        öderken hangi faturaya ne kadar yazılacağını elle hesaplamak yerine
        sistem sırayla kapatır. Artan tutar varsa işlem reddedilir — fazla
        tahsilat hasta bakiyesini eksiye düşürür.
        """
        if tutar <= 0:
            raise ValueError("Tahsilat tutarı sıfırdan büyük olmalıdır")

        acik = await self.income_repo.get_open_transactions(patient_id)
        if not acik:
            raise ValueError("Bu hastanın açık borcu yok")

        toplam_borc = round(sum(t["kalan_tutar"] for t in acik), 2)
        if tutar > toplam_borc + 0.01:
            raise ValueError(
                f"Tahsilat tutarı toplam borcu aşıyor. Toplam borç: {toplam_borc:.2f} ₺"
            )

        from app.schemas.finance import FinansOdemeCreate

        kalan_dagitilacak = round(tutar, 2)
        dagitim = []

        for islem in acik:
            if kalan_dagitilacak <= 0.001:
                break

            pay = min(islem["kalan_tutar"], kalan_dagitilacak)
            pay = round(pay, 2)
            if pay <= 0:
                continue

            await self.income_repo.add_payment(
                islem["id"],
                FinansOdemeCreate(
                    kasa_id=kasa_id,
                    tutar=pay,
                    odeme_tarihi=odeme_tarihi,
                    odeme_yontemi=odeme_yontemi,
                    taksit_sayisi=1,
                ),
            )
            dagitim.append(
                {
                    "islem_id": islem["id"],
                    "referans_kodu": islem["referans_kodu"],
                    "tutar": pay,
                    "kalan_borc": round(islem["kalan_tutar"] - pay, 2),
                }
            )
            kalan_dagitilacak = round(kalan_dagitilacak - pay, 2)

        await self.db.flush()
        return {
            "tahsil_edilen": round(tutar - kalan_dagitilacak, 2),
            "islem_sayisi": len(dagitim),
            "dagitim": dagitim,
        }

    async def update_transaction(self, tx_id: int, changes: dict):
        """
        İşlemin üst bilgilerini günceller.

        Kasa bakiyesini etkileyen alanlar (tutar, kasa_id) burada değiştirilemez —
        bakiye tutarlılığı ancak iptal + yeniden oluşturma ile korunur.
        """
        tx = await self.income_repo.get_transaction(tx_id)
        if not tx:
            return None

        if tx.durum == "iptal":
            raise ValueError("İptal edilmiş işlem güncellenemez")

        # SQLAlchemy modelinde bulunmayan veya bakiyeyi etkileyen alanları ayıkla
        blocked = {"tutar", "net_tutar", "kasa_id"}
        ignored = {"notlar"}
        values = {
            k: v
            for k, v in changes.items()
            if k not in blocked and k not in ignored and hasattr(FinansIslem, k)
        }

        if not values:
            return tx

        values["updated_by"] = self.context.user_id if self.context else None

        await self.db.execute(
            update(FinansIslem).where(FinansIslem.id == tx_id).values(**values)
        )
        await self.db.flush()
        return await self.income_repo.get_transaction(tx_id)

    async def cancel_transaction(self, tx_id: int, reason: str):
        """İşlemi iptal et ve kasa bakiyelerini geri al"""
        from sqlalchemy import select
        from app.repositories.finance.models import FinansOdeme, Kasa
        from app.services.audit_service import AuditService

        tx = await self.income_repo.get_transaction(tx_id)
        if not tx:
            raise ValueError("Transaction not found")

        hasta_id_str = str(tx.hasta_id) if tx.hasta_id else None

        # Update transaction status
        await self.db.execute(
            update(FinansIslem)
            .where(FinansIslem.id == tx_id)
            .values(
                durum="iptal",
                iptal_nedeni=reason,
                updated_by=self.context.user_id if self.context else None
            )
        )

        amount_rolled_back = 0
        kasa_ids_affected = []

        # Rollback payments from Kasa
        odemeler = (await self.db.execute(select(FinansOdeme).where(FinansOdeme.islem_id == tx_id))).scalars().all()
        for odeme in odemeler:
            if odeme.kasa_id:
                # Select with FOR UPDATE
                kasa_res = await self.db.execute(select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update())
                kasa_obj = kasa_res.scalar_one_or_none()

                if kasa_obj:
                    kasa_ids_affected.append(kasa_obj.id)
                    amount_rolled_back += float(odeme.tutar)
                    if tx.islem_tipi == "gelir":
                        kasa_obj.bakiye = float(kasa_obj.bakiye) - float(odeme.tutar)
                    elif tx.islem_tipi == "gider":
                        kasa_obj.bakiye = float(kasa_obj.bakiye) + float(odeme.tutar)

        await self.db.flush()

        if self.context:
            await AuditService.log(
                db=self.db,
                action="FINANCE_CANCEL",
                user_id=self.context.user_id,
                resource_type="transaction",
                resource_id=str(tx_id),
                details={
                    "hasta_id": hasta_id_str,
                    "iptal_nedeni": reason,
                    "islem_tipi": tx.islem_tipi,
                    "net_tutar": float(tx.net_tutar),
                    "amount_rolled_back": amount_rolled_back,
                    "kasa_ids_affected": kasa_ids_affected,
                    "method": "cancel_transaction"
                },
                ip_address=self.context.ip_address
            )

        return await self.income_repo.get_transaction(tx_id)

    async def delete_transaction(self, tx_id: int):
        """İşlemi sil (Soft delete) ve kasa bakiyelerini geri al"""
        from sqlalchemy import select
        from app.repositories.finance.models import FinansOdeme, Kasa
        from app.services.audit_service import AuditService

        tx = await self.income_repo.get_transaction(tx_id)
        if not tx:
            return False

        hasta_id_str = str(tx.hasta_id) if tx.hasta_id else None

        amount_rolled_back = 0
        kasa_ids_affected = []

        # Only rollback if it wasn't already cancelled
        if tx.durum != "iptal":
            odemeler = (await self.db.execute(select(FinansOdeme).where(FinansOdeme.islem_id == tx_id))).scalars().all()
            for odeme in odemeler:
                if odeme.kasa_id:
                    kasa_res = await self.db.execute(select(Kasa).where(Kasa.id == odeme.kasa_id).with_for_update())
                    kasa_obj = kasa_res.scalar_one_or_none()

                    if kasa_obj:
                        kasa_ids_affected.append(kasa_obj.id)
                        amount_rolled_back += float(odeme.tutar)
                        if tx.islem_tipi == "gelir":
                            kasa_obj.bakiye = float(kasa_obj.bakiye) - float(odeme.tutar)
                        elif tx.islem_tipi == "gider":
                            kasa_obj.bakiye = float(kasa_obj.bakiye) + float(odeme.tutar)

        await self.db.execute(
            update(FinansIslem)
            .where(FinansIslem.id == tx_id)
            .values(
                is_deleted=True,
                updated_by=self.context.user_id if self.context else None,
            )
        )
        await self.db.flush()

        if self.context:
            await AuditService.log(
                db=self.db,
                action="FINANCE_DELETE",
                user_id=self.context.user_id,
                resource_type="transaction",
                resource_id=str(tx_id),
                details={
                    "hasta_id": hasta_id_str,
                    "islem_tipi": tx.islem_tipi,
                    "net_tutar": float(tx.net_tutar),
                    "amount_rolled_back": amount_rolled_back,
                    "kasa_ids_affected": kasa_ids_affected,
                    "method": "delete_transaction"
                },
                ip_address=self.context.ip_address
            )

        return True
