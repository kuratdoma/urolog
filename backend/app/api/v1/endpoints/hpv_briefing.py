"""
HPV Briefing API Endpoints
Kondilom/HPV hastası için AI-destekli klinik özet.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.core.permissions import Action
from app.schemas.hpv_briefing import HPVBriefingResponse
from app.services.hpv_briefing_service import HPVBriefingService

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)

# RBAC: yetkiler PERMISSION_MATRIX["clinical"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("clinical", Action.READ)
logger = logging.getLogger(__name__)


@router.get("/{patient_id}", response_model=HPVBriefingResponse, dependencies=[Depends(_read)])
async def get_hpv_briefing(
    patient_id: str,
    force_refresh: bool = False,
    db: AsyncSession = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
):
    """
    Kondilom/HPV hastası için AI-destekli klinik briefing oluştur.

    Hastanın tüm klinik geçmişini (muayeneler, operasyonlar, takip notları,
    fotoğraflar, tıbbi müdahale raporları) tarayarak yapılandırılmış bir
    klinik özet oluşturur.

    - Partner durumu (bekâr/evli/partneri var)
    - Sigara durumu
    - İlk tanı ve operasyon tarihi
    - Nüks analizi (sıklık, trend)
    - Tedavi haritası (boyut → tedavi eşleşmesi)
    - Gardasil aşı durumu
    """
    service = HPVBriefingService()

    try:
        result = await service.generate_briefing(db, patient_id, force_refresh=force_refresh)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"HPV Briefing error for patient {patient_id}: {e}", exc_info=True)
        # SEC: ham hata mesajı client'a döndürülmüyor; server log'unda kalıyor.
        raise HTTPException(
            status_code=500,
            detail="HPV Briefing oluşturulurken bir hata oluştu."
        )
