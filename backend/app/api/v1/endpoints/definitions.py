from fastapi import APIRouter, Depends
from app.api import deps
from app.api.v1.endpoints.definition_modules.core_definitions import (
    router as core_router,
)
from app.api.v1.endpoints.definition_modules.staff_definitions import (
    router as staff_router,
)
from app.api.v1.endpoints.definition_modules.medical_definitions import (
    router as medical_router,
)

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)

# Alt Router Entegrasyonları
router.include_router(core_router)
router.include_router(staff_router)
router.include_router(medical_router)
