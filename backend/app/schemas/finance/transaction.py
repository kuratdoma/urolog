from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import date, datetime
from typing import Optional
from decimal import Decimal


class FinanceTransactionBase(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

    hasta_id: Optional[UUID] = None
    referans_kodu: str
    tarih: date
    islem_tipi: str  # gelir, gider
    tutar: Decimal
    para_birimi: str = "TRY"
    aciklama: Optional[str] = None
    doktor: Optional[str] = None


class FinanceTransactionCreate(FinanceTransactionBase):
    pass


class FinanceTransaction(FinanceTransactionBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
