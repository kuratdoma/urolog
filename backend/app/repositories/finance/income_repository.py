from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.user_context import UserContext
from app.repositories.finance.income_modules.transaction_mixin import (
    IncomeTransactionMixin,
)
from app.repositories.finance.income_modules.patient_mixin import (
    IncomePatientMixin,
)
from app.repositories.finance.income_modules.report_mixin import (
    IncomeReportMixin,
)


class IncomeRepository(
    IncomeTransactionMixin, IncomePatientMixin, IncomeReportMixin
):
    """
    Gelir ve hasta cari finans işlemlerini yöneten repository.

    Sorumluluklar mixin sınıflarına delege edilmiştir:
    - IncomeTransactionMixin: İşlem oluşturma, ödeme ekleme/silme, taksitler
    - IncomePatientMixin: Hasta bakiyesi, açık işlemler, cari ekstre
    - IncomeReportMixin: Arama, özetler, kategori kırılımı, yaşlandırma
    """

    def __init__(
        self, session: AsyncSession, context: Optional[UserContext] = None
    ):
        self.session = session
        self.context = context
