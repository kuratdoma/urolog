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

    async def get_transactions_multi(
        self, skip: int = 0, limit: int = 100, patient_id: Optional[UUID] = None
    ):
        """
        Returns transactions from the modern schema.
        """
        if patient_id:
            transactions = await self.income_repo.get_patient_transactions(patient_id)
            total = len(transactions)
        else:
            transactions = []
            total = 0

        return transactions, total

    async def create_transaction_safely(self, tx_data: dict) -> Any:
        """
        Ensures patient existence before creating a financial record.
        """
        if tx_data.get("hasta_id"):
            patient = await self.patient_repo.get_by_id(tx_data["hasta_id"])
            if not patient:
                raise ValueError("Referenced patient does not exist")

        if tx_data.get("islem_tipi") == "gider":
            tx = await self.expense_repo.create_expense_transaction(
                FinansIslemCreate(**tx_data)
            )
        else:
            tx = await self.income_repo.create_income_transaction(
                FinansIslemCreate(**tx_data)
            )

        await self.db.flush()
        return tx

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
