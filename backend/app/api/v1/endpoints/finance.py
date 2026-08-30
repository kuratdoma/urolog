from fastapi import APIRouter, Depends

from app.api import deps
from app.core.permissions import UserRole
from app.api.v1.endpoints.finance_modules.finance_definitions import (
    router as definitions_router,
)
from app.api.v1.endpoints.finance_modules.finance_transactions import (
    router as transactions_router,
)
from app.api.v1.endpoints.finance_modules.finance_patient_accounts import (
    router as patient_accounts_router,
)
from app.api.v1.endpoints.finance_modules.finance_recurring import (
    router as recurring_router,
)
from app.api.v1.endpoints.finance_modules.finance_reports import (
    router as reports_router,
)

router = APIRouter(
    # RBAC: Only ADMIN and DOCTOR can access finance module
    dependencies=[Depends(deps.require_role(UserRole.ADMIN, UserRole.DOCTOR))]
)

# Alt Router Entegrasyonları
router.include_router(definitions_router)
router.include_router(transactions_router)
router.include_router(patient_accounts_router)
router.include_router(recurring_router)
router.include_router(reports_router)
