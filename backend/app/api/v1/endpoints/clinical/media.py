from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api import deps
from app.core.permissions import Action
from app.repositories.clinical.repository import ClinicalRepository
from app.repositories.clinical.models import (
    FotografArsivi,
    TetkikSonuc,
)
from app.schemas.clinical import (
    FotografCreate,
    FotografResponse,
    FotografUpdate,
    TetkikSonucCreate,
    TetkikSonucResponse,
    TetkikSonucUpdate,
)
from app.core.security_helpers import validate_file_path
from app.models.user import User

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

# RBAC: yetkiler PERMISSION_MATRIX["imaging"] üzerinden işlem bazında uygulanır.
# Router seviyesinde tek rol listesi kullanmak salt-okunur rollerin de
# yazma uçlarına erişmesine yol açardı.
_read = deps.require_permission("imaging", Action.READ)
_create = deps.require_permission("imaging", Action.CREATE)
_update = deps.require_permission("imaging", Action.UPDATE)
public_router = APIRouter()


# --- FOTOĞRAF ARŞİVİ ---
@router.get("/patients/{hasta_id}/photos", response_model=List[FotografResponse], dependencies=[Depends(_read)])
async def read_photos(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_photos_by_patient(hasta_id)


@router.post("/photos", response_model=FotografResponse, dependencies=[Depends(_create)])
async def create_photo(
    *, db: AsyncSession = Depends(deps.get_db), photo_in: FotografCreate
) -> Any:
    repo = ClinicalRepository(db)
    return await repo.create_photo(photo_in)


@router.put("/photos/{id}", response_model=FotografResponse, dependencies=[Depends(_update)])
async def update_photo(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID, photo_in: FotografUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_photo(id, photo_in)
    if not result:
        raise HTTPException(status_code=404, detail="Photo not found")
    return result


@public_router.get("/photos/{id}/download")
async def download_photo(
    id: UUID,
    db: AsyncSession = Depends(deps.get_db),
    token: str = None,
    download: int = 0,
) -> Any:
    try:
        await deps.get_current_user_from_token(token=token, db=db)
        result = await db.execute(
            select(FotografArsivi).filter(FotografArsivi.id == id)
        )
        photo = result.scalars().first()
        if not photo:
            raise HTTPException(status_code=404, detail="Photo not found")

        file_path = photo.dosya_yolu
        if not file_path:
            raise HTTPException(status_code=404, detail="File path not found in record")

        safe_path = validate_file_path(file_path, allowed_base="static/")

        return FileResponse(
            path=safe_path,
            filename=(
                (photo.dosya_adi or os.path.basename(safe_path))
                if download == 1
                else None
            ),
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"download_photo error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.delete("/photos/{id}")
async def delete_photo(*, db: AsyncSession = Depends(deps.get_db), id: UUID, current_user: User = Depends(deps.get_current_active_superuser)) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_photo(id)
    if not result:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"status": "success", "id": id}


# --- GÖRÜNTÜLEME (TetkikSonuc - Goruntuleme) ---
@router.get("/patients/{hasta_id}/imagings", response_model=List[TetkikSonucResponse], dependencies=[Depends(_read)])
async def read_imagings(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_tetkik_sonuclari_by_patient(hasta_id, kategori="Goruntuleme")


@router.get("/imagings/{id}", response_model=TetkikSonucResponse, dependencies=[Depends(_read)])
async def read_imaging(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_tetkik_sonuc(id)
    if not result:
        raise HTTPException(status_code=404, detail="Imaging result not found")
    return result


@router.post("/imagings", response_model=TetkikSonucResponse, dependencies=[Depends(_create)])
async def create_imaging(
    *, db: AsyncSession = Depends(deps.get_db), imaging_in: TetkikSonucCreate
) -> Any:
    imaging_in.kategori = "Goruntuleme"
    repo = ClinicalRepository(db)
    return await repo.create_tetkik_sonuc(imaging_in)


@router.put("/imagings/{id}", response_model=TetkikSonucResponse, dependencies=[Depends(_update)])
async def update_imaging(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID, imaging_in: TetkikSonucUpdate
) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.update_tetkik_sonuc(id, imaging_in)
    if not result:
        raise HTTPException(status_code=404, detail="Imaging result not found")
    return result


@public_router.get("/imagings/{id}/download")
async def download_imaging(
    id: UUID, db: AsyncSession = Depends(deps.get_db), token: str = None
) -> Any:
    await deps.get_current_user_from_token(token=token, db=db)
    result = await db.execute(select(TetkikSonuc).filter(TetkikSonuc.id == id))
    imaging = result.scalars().first()
    if not imaging:
        raise HTTPException(status_code=404, detail="Imaging result not found")

    file_path = imaging.dosya_yolu
    if not file_path:
        raise HTTPException(status_code=404, detail="File path not found in record")

    safe_path = validate_file_path(file_path, allowed_base="static/")

    return FileResponse(
        path=safe_path, filename=imaging.dosya_adi or os.path.basename(safe_path)
    )


@router.delete("/imagings/{id}")
async def delete_imaging(*, db: AsyncSession = Depends(deps.get_db), id: UUID, current_user: User = Depends(deps.get_current_active_superuser)) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.delete_tetkik_sonuc(id)
    if not result:
        raise HTTPException(status_code=404, detail="Imaging result not found")
    return {"status": "success", "id": id}


# --- LABORATUVAR ---
@router.get("/patients/{hasta_id}/labs", response_model=List[TetkikSonucResponse], dependencies=[Depends(_read)])
async def read_labs(hasta_id: str, db: AsyncSession = Depends(deps.get_db)) -> Any:
    repo = ClinicalRepository(db)
    return await repo.get_tetkik_sonuclari_by_patient(hasta_id, kategori="Laboratuvar")


@router.get("/labs/{id}", response_model=TetkikSonucResponse, dependencies=[Depends(_read)])
async def read_lab(*, db: AsyncSession = Depends(deps.get_db), id: UUID) -> Any:
    repo = ClinicalRepository(db)
    result = await repo.get_tetkik_sonuc(id)
    if not result:
        raise HTTPException(status_code=404, detail="Lab result not found")
    return result
