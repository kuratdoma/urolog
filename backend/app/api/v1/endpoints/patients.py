from typing import Any, List, Optional
from uuid import UUID
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from app.core.limiter import limiter
from fastapi_cache.decorator import cache
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, cast, Date
from fastapi.responses import StreamingResponse
import csv
import io
import asyncio

from app.api import deps
from app.schemas.patient import PatientResponse, PatientCreate, PatientUpdate
from app.schemas.patient.legacy import PatientLegacyResponse
from app.schemas.patient.demographics import (
    PatientDemographicsCreate,
    PatientDemographicsUpdate,
    PatientFullProfile,
)
from app.services.audit_service import AuditService
from app.models.user import User
from app.controllers.legacy_adapters.patient_controller import PatientController
from app.core.user_context import UserContext
from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Muayene, Operasyon
from app.services.orchestrators.patient_orchestrator import PatientOrchestrator

router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)

# PERF: /advanced-search/export için üst sınır — filtre çok geniş/boş
# bırakılırsa tüm hasta tablosunun sınırsız export edilmesini engeller.
EXPORT_MAX_ROWS = 20_000

# --- SEARCH & REFERENCE ROUTES (STATIC) ---
# MUST BE DEFINED BEFORE GENERIC PATH PARAMETERS /{id}


@router.get("/references")
async def get_references(db: AsyncSession = Depends(deps.get_db)) -> List[str]:
    """Get all unique references."""
    controller = PatientController(db)
    return await controller.get_unique_references()


@router.get("/advanced-search")
@limiter.limit("60/minute")
async def advanced_search(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    tani: Optional[str] = Query(None, description="Tanı metni"),
    yas_min: Optional[int] = Query(None),
    yas_max: Optional[int] = Query(None),
    muayene_tarihi_baslangic: Optional[str] = Query(None),
    muayene_tarihi_bitis: Optional[str] = Query(None),
    son_islem_tarihi_baslangic: Optional[str] = Query(None),
    son_islem_tarihi_bitis: Optional[str] = Query(None),
    ilk_kayit_tarihi_baslangic: Optional[str] = Query(None),
    ilk_kayit_tarihi_bitis: Optional[str] = Query(None),
    operasyon_tarihi_baslangic: Optional[str] = Query(None),
    operasyon_tarihi_bitis: Optional[str] = Query(None),
    operasyon_adi: Optional[str] = Query(None),
    sikayet: Optional[str] = Query(None),
    oyku: Optional[str] = Query(None),
    bulgu: Optional[str] = Query(None),
    referans: Optional[str] = Query(None),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """Advanced patient search with cross-table filtering and pagination."""
    try:
        base_stmt = _build_advanced_search_query(
            tani,
            yas_min,
            yas_max,
            muayene_tarihi_baslangic,
            muayene_tarihi_bitis,
            son_islem_tarihi_baslangic,
            son_islem_tarihi_bitis,
            ilk_kayit_tarihi_baslangic,
            ilk_kayit_tarihi_bitis,
            operasyon_tarihi_baslangic,
            operasyon_tarihi_bitis,
            operasyon_adi,
            sikayet,
            oyku,
            bulgu,
            referans,
        )

        count_stmt = select(func.count()).select_from(base_stmt.subquery())
        total_count = await db.scalar(count_stmt) or 0

        base_stmt = base_stmt.order_by(
            Hasta.updated_at.desc().nulls_last()
        )
        base_stmt = base_stmt.offset(skip).limit(limit)

        result = await db.execute(base_stmt)
        patient_ids = []
        for row in result.all():
            val = row[0]
            if isinstance(val, str):
                try:
                    patient_ids.append(UUID(val))
                except ValueError:
                    patient_ids.append(val)
            else:
                patient_ids.append(val)

        if not patient_ids:
            return {
                "items": [],
                "total": total_count,
                "page": (skip // limit) + 1 if limit > 0 else 1,
                "size": limit,
            }

        context = UserContext(
            user_id=getattr(request.state, "user_id", None),
            username=getattr(request.state, "username", None),
            ip_address=request.client.host,
        )
        orchestrator = PatientOrchestrator(db, context)
        controller = PatientController(db, context)

        patients_result = await db.execute(
            select(Hasta)
            .where(Hasta.id.in_(patient_ids))
            .order_by(Hasta.updated_at.desc().nulls_last())
        )
        patients_list = patients_result.scalars().all()

        exam_task = orchestrator.clinical_repo.get_latest_examinations_for_patients(
            patient_ids
        )
        stats_task = orchestrator.stats_repo.get_counts_batch(patient_ids)
        # Await sequentially to avoid asyncpg 'another operation is in progress' errors
        latest_exams = await exam_task
        stats_map = await stats_task
        exam_map = {e.hasta_id: e for e in latest_exams}

        results = []
        for p in patients_list:
            exam = exam_map.get(p.id)
            stats = stats_map.get(p.id, {})
            son_tani = None
            son_muayene_tarihi = None
            if exam:
                son_muayene_tarihi = exam.tarih
                # Fix: ensure date type for serialization
                if isinstance(son_muayene_tarihi, datetime):
                    son_muayene_tarihi = son_muayene_tarihi.date()

                son_tani = exam.tani1 or (
                    f"[{exam.tani1_kodu}]" if exam.tani1_kodu else None
                )

            profile = PatientFullProfile.model_validate(p)
            profile.son_tani = son_tani
            profile.son_muayene_tarihi = son_muayene_tarihi
            for k, v in stats.items():
                setattr(profile, f"{k}_count", v)
            results.append(controller._map_to_legacy(profile))

        results.sort(
            key=lambda x: patient_ids.index(x.id) if x.id in patient_ids else 999
        )
        return {
            "items": results,
            "total": total_count,
            "page": (skip // limit) + 1 if limit > 0 else 1,
            "size": limit,
        }
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        
        logger.error(f"advanced_search error: {e}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.get("/advanced-search/export")
@limiter.limit("5/minute")
async def export_advanced_search(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    tani: Optional[str] = Query(None),
    yas_min: Optional[int] = Query(None),
    yas_max: Optional[int] = Query(None),
    muayene_tarihi_baslangic: Optional[str] = Query(None),
    muayene_tarihi_bitis: Optional[str] = Query(None),
    son_islem_tarihi_baslangic: Optional[str] = Query(None),
    son_islem_tarihi_bitis: Optional[str] = Query(None),
    ilk_kayit_tarihi_baslangic: Optional[str] = Query(None),
    ilk_kayit_tarihi_bitis: Optional[str] = Query(None),
    operasyon_tarihi_baslangic: Optional[str] = Query(None),
    operasyon_tarihi_bitis: Optional[str] = Query(None),
    operasyon_adi: Optional[str] = Query(None),
    sikayet: Optional[str] = Query(None),
    oyku: Optional[str] = Query(None),
    bulgu: Optional[str] = Query(None),
    referans: Optional[str] = Query(None),
) -> StreamingResponse:
    """Export advanced search results as CSV."""

    base_stmt = _build_advanced_search_query(
        tani,
        yas_min,
        yas_max,
        muayene_tarihi_baslangic,
        muayene_tarihi_bitis,
        son_islem_tarihi_baslangic,
        son_islem_tarihi_bitis,
        ilk_kayit_tarihi_baslangic,
        ilk_kayit_tarihi_bitis,
        operasyon_tarihi_baslangic,
        operasyon_tarihi_bitis,
        operasyon_adi,
        sikayet,
        oyku,
        bulgu,
        referans,
    )
    # SEC/PERF: filtre çok genişse (veya boşsa) tüm hasta tablosunu
    # sınırsız sorgulayıp export etmeyi engelle. StreamingResponse
    # başlamadan ÖNCE kontrol edilmeli — aksi halde 200 dönüp yanıt
    # gövdesinin ortasında hataya düşer.
    count_stmt = select(func.count()).select_from(base_stmt.subquery())
    total_count = await db.scalar(count_stmt) or 0
    if total_count > EXPORT_MAX_ROWS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Filtrelenen kayıt sayısı ({total_count}) izin verilen "
                f"maksimumu ({EXPORT_MAX_ROWS}) aşıyor. Lütfen filtreleri "
                "daraltıp tekrar deneyin."
            ),
        )

    base_stmt = base_stmt.order_by(Hasta.updated_at.desc().nulls_last())

    async def generate():
        try:
            # [BIG-O] O(K) memory per yield instead of O(N) buffer
            result = await db.execute(base_stmt)
            
            output = io.StringIO()
            writer = csv.writer(output)
            output.write("\ufeff")
            writer.writerow(
                [
                    "TC Kimlik",
                    "Ad",
                    "Soyad",
                    "Doğum Tarihi",
                    "Cinsiyet",
                    "Telefon",
                    "Email",
                    "Protokol No",
                    "Referans",
                    "Oluşturulma Tarihi",
                ]
            )
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)

            # Fetch patient objects in chunks of 100 to avoid memory overflow
            while True:
                rows = result.fetchmany(100)
                if not rows:
                    break
                
                patient_ids = [row[0] for row in rows]
                
                p_task = await db.execute(
                    select(Hasta)
                    .where(Hasta.id.in_(patient_ids))
                    .order_by(Hasta.updated_at.desc().nulls_last())
                )
                patients_chunk = p_task.scalars().all()

                for p in patients_chunk:
                    writer.writerow(
                        [
                            p.tc_kimlik or "",
                            p.ad or "",
                            p.soyad or "",
                            p.dogum_tarihi.isoformat() if p.dogum_tarihi else "",
                            p.cinsiyet or "",
                            p.cep_tel or "",
                            p.email or "",
                            p.protokol_no or "",
                            p.referans or "",
                            p.created_at.strftime("%Y-%m-%d %H:%M") if p.created_at else "",
                        ]
                    )
                    yield output.getvalue()
                    output.seek(0)
                    output.truncate(0)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"export_advanced_search generator error: {e}")
            yield f"Error: {str(e)}"

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=patients_export.csv"},
    )


# --- COLLECTION ROUTES ---


@router.get("")
@limiter.limit("100/minute")
@cache(expire=30)
async def read_patients(
    request: Request,
    db: AsyncSession = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
    search: str = Query(None),
    ad: str = Query(None),
    soyad: str = Query(None),
) -> Any:
    """Retrieve patients."""
    try:
        context = UserContext(
            user_id=getattr(request.state, "user_id", None),
            username=getattr(request.state, "username", None),
            ip_address=request.client.host,
        )
        controller = PatientController(db, context)
        return await controller.get_patients(
            skip=skip, limit=limit, search=search, ad=ad, soyad=soyad
        )
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.post("", response_model=PatientResponse)
async def create_patient(
    *,
    db: AsyncSession = Depends(deps.get_db),
    patient_in: PatientCreate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Create new patient."""
    context = UserContext(user_id=current_user.id, username=current_user.username)
    controller = PatientController(db, context)
    patient_data = patient_in.model_dump()
    controller_in = PatientDemographicsCreate(**patient_data)
    patient = await controller.create_patient(controller_in)
    try:
        patient_dict = patient.model_dump()
        await AuditService.log(
            db=db,
            action="PATIENT_CREATE",
            user_id=current_user.id,
            resource_type="patient",
            resource_id=str(patient_dict["id"]),
            details={"status": "created"},
        )
    except Exception as e:
        print(f"AUDIT LOG ERROR: {e}")
    return patient


# --- INSTANCE ROUTES (DYNAMIC) ---


@router.get("/{id}/timeline")
@cache(expire=30)
async def get_patient_timeline(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> List[dict]:
    """Get patient timeline."""
    controller = PatientController(db)
    return await controller.get_timeline(id)


@router.get("/{id}", response_model=PatientLegacyResponse)
async def read_patient(
    *, request: Request, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    """Get patient by ID."""
    try:
        context = UserContext(
            user_id=getattr(request.state, "user_id", None),
            username=getattr(request.state, "username", None),
            ip_address=request.client.host,
        )
        controller = PatientController(db, context)
        patient = await controller.get_patient_profile(id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient
    except HTTPException as he:
        raise he
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.get("/{id}/counts")
@cache(expire=60)
async def get_patient_counts(
    *, db: AsyncSession = Depends(deps.get_db), id: UUID
) -> Any:
    """Get record counts for a patient."""
    controller = PatientController(db)
    return await controller.get_counts(id)


@router.put("/{id}", response_model=PatientResponse)
async def update_patient(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    patient_in: PatientUpdate,
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """Update a patient."""
    try:
        context = UserContext(user_id=current_user.id, username=current_user.username)
        controller = PatientController(db, context)
        update_data = patient_in.model_dump(exclude_unset=True)
        controller_in = PatientDemographicsUpdate(**update_data)
        updated_patient = await controller.update_patient(id, controller_in)
        if not updated_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        try:
            p_dict = updated_patient.model_dump()
            await AuditService.log(
                db=db,
                action="PATIENT_UPDATE",
                user_id=current_user.id,
                resource_type="patient",
                resource_id=str(p_dict["id"]),
                details={"updated_fields": update_data},
            )
        except Exception:
            pass
        return updated_patient
    except HTTPException as he:
        raise he
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


@router.delete("/{id}")
async def delete_patient(
    *,
    db: AsyncSession = Depends(deps.get_db),
    id: UUID,
    current_user: User = Depends(deps.get_current_active_superuser),
) -> Any:
    """Delete a patient."""
    try:
        context = UserContext(user_id=current_user.id, username=current_user.username)
        controller = PatientController(db, context)
        result = await controller.delete_patient(id)
        if not result:
            raise HTTPException(status_code=404, detail="Patient not found")
        await AuditService.log(
            db=db,
            action="PATIENT_DELETE",
            user_id=current_user.id,
            resource_type="patient",
            resource_id=str(id),
            details={"patient_id": str(id)},
        )
        return result
    except HTTPException as he:
        raise he
    except Exception:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail="İşlem sırasında bir hata oluştu")


# --- UTILITIES ---


def _build_advanced_search_query(
    tani: Optional[str],
    yas_min: Optional[int],
    yas_max: Optional[int],
    muayene_tarihi_baslangic: Optional[str],
    muayene_tarihi_bitis: Optional[str],
    son_islem_tarihi_baslangic: Optional[str],
    son_islem_tarihi_bitis: Optional[str],
    ilk_kayit_tarihi_baslangic: Optional[str],
    ilk_kayit_tarihi_bitis: Optional[str],
    operasyon_tarihi_baslangic: Optional[str],
    operasyon_tarihi_bitis: Optional[str],
    operasyon_adi: Optional[str],
    sikayet: Optional[str],
    oyku: Optional[str],
    bulgu: Optional[str],
    referans: Optional[str] = None,
):
    base_stmt = select(Hasta.id).where(
        Hasta.is_deleted == False
    )

    if yas_min is not None or yas_max is not None:
        today = date.today()
        if yas_max is not None:
            try:
                min_dob = today.replace(year=today.year - yas_max - 1)
            except ValueError:
                min_dob = today.replace(year=today.year - yas_max - 1, day=28)
            base_stmt = base_stmt.where(
                Hasta.dogum_tarihi >= min_dob
            )
        if yas_min is not None:
            try:
                max_dob = today.replace(year=today.year - yas_min)
            except ValueError:
                max_dob = today.replace(year=today.year - yas_min, day=28)
            base_stmt = base_stmt.where(
                Hasta.dogum_tarihi <= max_dob
            )

    if ilk_kayit_tarihi_baslangic:
        base_stmt = base_stmt.where(
            cast(Hasta.created_at, Date)
            >= ilk_kayit_tarihi_baslangic
        )
    if ilk_kayit_tarihi_bitis:
        base_stmt = base_stmt.where(
            cast(Hasta.created_at, Date) <= ilk_kayit_tarihi_bitis
        )

    # ── Muayene filters: consolidated into single EXISTS ──────────────
    # Instead of 4+ separate IN (subquery) against muayeneler table,
    # combine all muayene-related conditions into one correlated EXISTS.
    muayene_conditions = [Muayene.hasta_id == Hasta.id, Muayene.is_deleted == False]
    has_muayene_filter = False

    if tani:
        has_muayene_filter = True
        muayene_conditions.append(
            or_(
                Muayene.tani1.ilike(f"%{tani}%"),
                Muayene.tani2.ilike(f"%{tani}%"),
                Muayene.tani3.ilike(f"%{tani}%"),
                Muayene.tani4.ilike(f"%{tani}%"),
                Muayene.tani5.ilike(f"%{tani}%"),
                Muayene.tani1_kodu.ilike(f"%{tani}%"),
                Muayene.tani2_kodu.ilike(f"%{tani}%"),
                Muayene.tani3_kodu.ilike(f"%{tani}%"),
                Muayene.tani4_kodu.ilike(f"%{tani}%"),
                Muayene.tani5_kodu.ilike(f"%{tani}%"),
                Muayene.tedavi.ilike(f"%{tani}%"),
                Muayene.sonuc.ilike(f"%{tani}%"),
            )
        )

    if muayene_tarihi_baslangic:
        has_muayene_filter = True
        muayene_conditions.append(cast(Muayene.tarih, Date) >= muayene_tarihi_baslangic)
    if muayene_tarihi_bitis:
        has_muayene_filter = True
        muayene_conditions.append(cast(Muayene.tarih, Date) <= muayene_tarihi_bitis)

    if sikayet:
        has_muayene_filter = True
        muayene_conditions.append(Muayene.sikayet.ilike(f"%{sikayet}%"))

    if oyku:
        has_muayene_filter = True
        muayene_conditions.append(Muayene.oyku.ilike(f"%{oyku}%"))

    if bulgu:
        has_muayene_filter = True
        muayene_conditions.append(
            or_(
                Muayene.bulgu_notu.ilike(f"%{bulgu}%"),
                Muayene.fizik_muayene.ilike(f"%{bulgu}%"),
            )
        )

    if has_muayene_filter:
        exists_subq = select(Muayene.id).where(and_(*muayene_conditions)).exists()
        base_stmt = base_stmt.where(exists_subq)

    # ── Son işlem tarihi ─────────────────────────────────────────────
    if son_islem_tarihi_baslangic:
        base_stmt = base_stmt.where(
            cast(Hasta.updated_at, Date)
            >= son_islem_tarihi_baslangic
        )
    if son_islem_tarihi_bitis:
        base_stmt = base_stmt.where(
            cast(Hasta.updated_at, Date) <= son_islem_tarihi_bitis
        )

    # ── Operasyon filters: consolidated into single EXISTS ────────────
    op_conditions = [Operasyon.hasta_id == Hasta.id, Operasyon.is_deleted == False]
    has_op_filter = False

    if operasyon_tarihi_baslangic:
        has_op_filter = True
        op_conditions.append(cast(Operasyon.tarih, Date) >= operasyon_tarihi_baslangic)
    if operasyon_tarihi_bitis:
        has_op_filter = True
        op_conditions.append(cast(Operasyon.tarih, Date) <= operasyon_tarihi_bitis)
    if operasyon_adi:
        has_op_filter = True
        op_conditions.append(Operasyon.ameliyat.ilike(f"%{operasyon_adi}%"))

    if has_op_filter:
        op_exists = select(Operasyon.id).where(and_(*op_conditions)).exists()
        base_stmt = base_stmt.where(op_exists)

    if referans:
        base_stmt = base_stmt.where(
            Hasta.referans.ilike(f"%{referans}%")
        )

    return base_stmt

