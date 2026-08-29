import logging
from typing import List, Any, Optional
from fastapi import APIRouter, Depends, Query, Request, HTTPException, UploadFile, File, Body
from app.core.limiter import limiter
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from fastapi_cache.decorator import cache
from app.repositories.system_repository import SystemRepository
import os
from datetime import datetime
from app.schemas.system import ICDTaniResponse, ICDTaniCreate, IlacResponse, BackupResponse
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)


@router.get("/backups", response_model=List[BackupResponse])
async def list_backups(
    current_user: User = Depends(deps.get_current_active_superuser),
):
    """
    List files in /data_import directory
    """
    # Docker uses /data_import, local dev might use ../03.db_import
    # We check if it exists
    path = "/data_import"
    backups = []
    try:
        if not os.path.exists(path):
            logger.warning(f"Bakım dizini bulunamadı: {path}")
            return []
            
        for f in os.listdir(path):
            if f.startswith("."):
                continue
            full_path = os.path.join(path, f)
            if not os.path.isfile(full_path):
                continue
                
            stats = os.stat(full_path)
            backups.append(
                {
                    "name": f,
                    "size": stats.st_size,
                    "created_at": datetime.fromtimestamp(stats.st_ctime).isoformat(),
                    "modified_at": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                }
            )
    except Exception as e:
        logger.error(f"Backups klasörü okunurken hata: {str(e)}")
        return []

    # Sort by mtime descending
    backups.sort(key=lambda x: x["modified_at"], reverse=True)
    return backups


@router.get("/icd", response_model=List[ICDTaniResponse])
@limiter.limit("30/minute")
@cache(expire=3600)
async def get_icds(
    request: Request,
    q: Optional[str] = Query(None, description="Search query for ICD code or name"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    """
    Get ICD-10 codes, optionally searching by code or description.
    """
    repo = SystemRepository(db)
    return await repo.search_icd(q, skip, limit)


@router.get("/icd/{code}", response_model=ICDTaniResponse)
async def get_icd_by_code(
    code: str, db: AsyncSession = Depends(deps.get_db)
) -> Any:
    """
    Get a specific ICD code by its string code (e.g. A00).
    """
    repo = SystemRepository(db)
    icd = await repo.get_icd_by_code(code)
    if not icd:
        raise HTTPException(status_code=404, detail="ICD code not found")
    return icd


@router.post("/icd", response_model=ICDTaniResponse)
async def create_icd(
    obj_in: ICDTaniCreate,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """
    Create a new ICD code entry.
    """
    repo = SystemRepository(db)
    # Check if already exists
    existing = await repo.get_icd_by_code(obj_in.kodu)
    if existing:
        raise HTTPException(status_code=400, detail="ICD code already exists")

    return await repo.create_icd(obj_in)


@router.post("/icd/delete-batch")
async def batch_delete_icd(
    ids: List[int], db: AsyncSession = Depends(deps.get_db), current_user=Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Batch delete ICD records.
    """
    repo = SystemRepository(db)
    await repo.delete_icds(ids)
    return {"status": "success", "deleted_count": len(ids)}


# --- Drugs (İlaçlar) ---


@router.get("/drugs", response_model=List[IlacResponse])
@limiter.limit("60/minute")
@cache(expire=300)
async def get_drugs(
    request: Request,
    q: Optional[str] = Query(
        None, description="Search drug by name, barcode or active ingredient"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: AsyncSession = Depends(deps.get_db),
) -> Any:
    repo = SystemRepository(db)
    return await repo.search_drugs(q, skip, limit)


@router.post("/drugs/upload")
async def upload_drugs_excel(
    file: UploadFile = File(...), db: AsyncSession = Depends(deps.get_db), current_user=Depends(deps.get_current_active_superuser)
) -> Any:
    """
    Complete replacement of drug database from Excel file.
    Expected columns: 'İlaç Adı', 'Barkod', 'Etkin Madde', 'ATC Kodu', 'Firma', 'Fiyat', 'Reçete Tipi'
    """
    # Read file
    content = await file.read()

    import pandas as pd
    import io

    try:
        # Try finding mimetype or just try excel
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            # CSV Handling with robust encoding/separator detection
            encodings = ["utf-8", "cp1254", "latin1"]
            separators = [",", ";", "\t"]

            df = None
            last_error = None

            for encoding in encodings:
                for sep in separators:
                    try:
                        # Try reading
                        temp_df = pd.read_csv(
                            io.BytesIO(content), sep=sep, encoding=encoding
                        )

                        # Basic validation: Check if we have multiple columns or known headers
                        # If we have only 1 column, it might be a wrong separator, unless the file has only 1 column
                        if len(temp_df.columns) > 1:
                            df = temp_df
                            break

                        # If we have 1 column but it contains specific keywords, accept it
                        # But usually drug files have multiple columns
                        if (
                            "ilah" in temp_df.columns[0].lower()
                            or "drug" in temp_df.columns[0].lower()
                            or "barkod" in temp_df.columns[0].lower()
                        ):
                            df = temp_df
                            break

                    except Exception as e:
                        last_error = e
                        continue
                if df is not None:
                    break

            if df is None:
                # Fallback to python engine with auto detection
                try:
                    df = pd.read_csv(io.BytesIO(content), sep=None, engine="python")
                except:
                    from fastapi import HTTPException

                    raise HTTPException(
                        status_code=400,
                        detail=f"Dosya okunamadı. Lütfen CSV formatını kontrol edin. (Hata: {str(last_error)})",
                    )

    except Exception as e:
        # If we caught it above strictly, this might be redundant for read errors but needed for syntax
        # Check if it is already an HTTPException
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="Dosya işlenirken hata oluştu")

    # Normalize columns
    # We expect some variations, so let's try to map
    column_map = {
        "İlaç Adı": "name",
        "Piyasa Adı": "name",
        "Adı": "name",
        "Barkod": "barcode",
        "Barkodu": "barcode",
        "Etkin Madde": "etkin_madde",
        "ATC Kodu": "atc_kodu",
        "ATC": "atc_kodu",
        "Firma": "firma",
        "Firma Adı": "firma",
        "Fiyat": "fiyat",
        "Reçete Tipi": "recete_tipi",
        "Reçete Türü": "recete_tipi",
    }

    df = df.rename(columns=column_map)

    # Ensure 'name' exists
    if "name" not in df.columns:
        # If we can't find name column, try the first column
        df["name"] = df.iloc[:, 0]

    # Fill NaNs
    df = df.fillna("")

    # Prepare list of dicts
    drugs_data = []

    # Limit to reasonable amount if huge? or just process all.
    # Let's process batches if needed, but for now just all.

    for _, row in df.iterrows():
        name = str(row.get("name", "")).strip()
        if not name:
            continue

        drug = {
            "name": name,
            "barcode": (
                str(row.get("barcode", "")).strip() if row.get("barcode") else None
            ),
            "etkin_madde": (
                str(row.get("etkin_madde", "")).strip()
                if row.get("etkin_madde")
                else None
            ),
            "atc_kodu": (
                str(row.get("atc_kodu", "")).strip() if row.get("atc_kodu") else None
            ),
            "firma": str(row.get("firma", "")).strip() if row.get("firma") else None,
            "fiyat": str(row.get("fiyat", "")).strip() if row.get("fiyat") else None,
            "recete_tipi": (
                str(row.get("recete_tipi", "")).strip()
                if row.get("recete_tipi")
                else "Normal"
            ),
            "aktif": True,
        }
        drugs_data.append(drug)

    # clear existing
    repo = SystemRepository(db)
    await repo.delete_all_drugs()

    # insert new
    count = await repo.batch_create_drugs(drugs_data)

    return {"status": "success", "imported_count": count}


@router.post("/drugs/import-local")
async def import_local_drugs(
    filename: str = Body(..., embed=True),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_superuser),
):
    """
    Import drug database from a local file in /data_import
    """
    path = "/data_import"
    full_path = os.path.join(path, filename)

    # Security check: ensure file is within /data_import
    if not os.path.realpath(full_path).startswith(os.path.realpath(path)):
        raise HTTPException(status_code=400, detail="Invalid path")

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="File not found")

    repo = SystemRepository(db)
    try:
        count = await repo.import_drugs_from_file(full_path)
        return {"status": "success", "imported_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
