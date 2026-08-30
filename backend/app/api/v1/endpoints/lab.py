from datetime import datetime
from typing import Any, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import deps
from app.services.lab_parser_service import LabParserService, LabParserResponse
from app.services.pdf_lab_parser_service import (
    PDFLabParserService,
    PDFLabParserResponse,
)
from pydantic import BaseModel
from app.repositories.clinical.repository import ClinicalRepository
from app.schemas.clinical import TetkikSonucCreate, TetkikSonucResponse
from app.services.lab_analysis_service import get_lab_analysis_service
from app.schemas.lab_analysis import LabAnalysisResponse


class LabTextCreate(BaseModel):
    text: str


router = APIRouter(
    # SEC-09: Router seviyesinde kimlik doğrulama
    dependencies=[Depends(deps.get_current_user)]
)


@router.post("/parse", response_model=LabParserResponse)
async def parse_lab_text(
    *,
    text_in: LabTextCreate,
) -> Any:
    """Parse raw lab text."""
    return LabParserService.parse_text(text_in.text)


@router.post("/parse-pdf", response_model=PDFLabParserResponse)
async def parse_lab_pdf(file: UploadFile = File(...)) -> Any:
    """Parse lab results from uploaded PDF file."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400, detail="Sadece PDF dosyaları kabul edilmektedir."
        )

    try:
        pdf_bytes = await file.read()
        result = PDFLabParserService.parse_pdf(pdf_bytes)
        return result
    except Exception:
        raise HTTPException(status_code=500, detail="PDF işlenirken hata oluştu")


@router.post("/analyze", response_model=LabAnalysisResponse)
async def analyze_lab_file(file: UploadFile = File(...)) -> Any:
    """
    Analyze uploaded lab report (PDF or Image) using AI to extract structured data.
    """
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya türü. İzin verilenler: {', '.join(allowed_types)}",
        )

    try:
        content = await file.read()
        
        # Bypass Gemini for PDFs and use local parser
        if file.content_type == "application/pdf":
            parsed = PDFLabParserService.parse_pdf(content)
            if not parsed.success:
                raise ValueError("Geçersiz dosya formatı")
            
            # Map PDFLabResult to expected UI format
            results_mapped = []
            for item in parsed.results:
                results_mapped.append({
                    "test_name": item.test_name,
                    "result_value": item.value,
                    "unit": item.unit,
                    "reference_range": item.reference,
                    "is_abnormal": False,
                    "category": "Laboratuvar", 
                    "report_date": parsed.report_date
                })
                
            return LabAnalysisResponse(
                patient_name="Bilinmiyor",
                report_date=parsed.report_date,
                results=results_mapped,
                confidence_score=99.0
            )

        # Fallback to AI Analysis for images
        service = get_lab_analysis_service()
        result = await service.analyze_lab_file(content, file.content_type)
        return result
    except ValueError:
        raise HTTPException(status_code=400, detail="Geçersiz dosya formatı")
    except Exception:
        raise HTTPException(status_code=500, detail="Analiz sırasında hata oluştu")


# --- CUSTOM FRONTEND ENDPOINTS FOR UNIFIED REPO (TetkikSonuc) ---


@router.post("/urine", response_model=bool)
async def create_urine(
    *, db: AsyncSession = Depends(deps.get_db), payload: dict = Body(...)
) -> Any:
    repo = ClinicalRepository(db)

    hasta_id = payload.get("hasta_id")
    tarih = payload.get("tarih")

    async def add(name, val, unit=""):
        if val:
            s = str(val) + (f" {unit}" if unit else "")
            await repo.create_tetkik_sonuc(
                TetkikSonucCreate(
                    hasta_id=hasta_id,
                    tarih=tarih,
                    tetkik_adi=name,
                    sonuc=s,
                    kategori="Laboratuvar",
                )
            )

    await add("İdrar - Dansite", payload.get("dansite"))
    await add("İdrar - pH", payload.get("ph"))
    await add("İdrar - Protein", payload.get("protein"))
    await add("İdrar - Glukoz", payload.get("glukoz"))
    await add("İdrar - Keton", payload.get("keton"))
    await add("İdrar - Bilirubin", payload.get("bilirubin"))
    await add("İdrar - Ürobilinojen", payload.get("urobilinojen"))
    await add("İdrar - Nitrit", payload.get("nitrit"))
    await add("İdrar - Lökosit Esteraz", payload.get("lokosit_esteraz"))
    await add("İdrar - Kan/Hemoglobin", payload.get("kan"))

    await add("İdrar Mik. - Lökosit", payload.get("mik_lokosit"), "/HPF")
    await add("İdrar Mik. - Eritrosit", payload.get("mik_eritrosit"), "/HPF")
    await add("İdrar Mik. - Epitel", payload.get("mik_epitel"))
    await add("İdrar Mik. - Bakteri", payload.get("mik_bakteri"))
    await add("İdrar Mik. - Kristaller", payload.get("mik_kristaller"))
    await add("İdrar Mik. - Silindirler", payload.get("mik_silindirler"))

    await add("İdrar - Sediment", payload.get("sediment"))
    await add("İdrar Notu", payload.get("notlar"))

    kultur = payload.get("kultur")
    if kultur:
        k_map = {
            "ureme_yok": "Üreme Yok",
            "ureme_var": "Üreme Var",
            "kontamine": "Kontamine",
        }
        await add("İdrar Kültürü", k_map.get(kultur, kultur))

    await add("İdrar Kül. - Koloni", payload.get("koloni"), "cfu/ml")
    await add("İdrar Kül. - Bakteri", payload.get("bakteri"))
    await add("İdrar Kül. - Antibiyogram", payload.get("antibiyotik"))

    return True


@router.post("/hemogram", response_model=bool)
async def create_hemogram(
    *, db: AsyncSession = Depends(deps.get_db), payload: dict = Body(...)
) -> Any:
    repo = ClinicalRepository(db)
    hasta_id = payload.get("hasta_id")
    tarih = payload.get("tarih")

    async def add(name, val, unit=""):
        if val:
            s = str(val) + (f" {unit}" if unit else "")
            await repo.create_tetkik_sonuc(
                TetkikSonucCreate(
                    hasta_id=hasta_id,
                    tarih=tarih,
                    tetkik_adi=name,
                    sonuc=s,
                    kategori="Laboratuvar",
                )
            )

    await add("Hemogram - WBC", payload.get("wbc"), "10^3/uL")
    await add("Hemogram - HGB (Hb)", payload.get("hb"), "g/dL")
    await add("Hemogram - HCT", payload.get("hct"), "%")
    await add("Hemogram - PLT", payload.get("plt"), "10^3/uL")
    await add("Hemogram - NEU%", payload.get("neu"), "%")
    await add("Hemogram - LYM%", payload.get("lym"), "%")

    return True


@router.post("/spermiogram", response_model=bool)
async def create_spermiogram_custom(
    *, db: AsyncSession = Depends(deps.get_db), payload: dict = Body(...)
) -> Any:
    # 1. Save as text summary (TetkikSonuc) for general history view
    repo = ClinicalRepository(db)
    lines = []

    # Macroscopic
    if payload.get("volum"):
        lines.append(f"Volüm: {payload['volum']} ml")
    if payload.get("ph"):
        lines.append(f"pH: {payload['ph']}")
    if payload.get("viskozite") and payload.get("viskozite") != "Normal":
        lines.append(f"Viskozite: {payload['viskozite']}")
    if payload.get("likefaksiyon") and payload.get("likefaksiyon") != "Normal":
        lines.append(f"Likefaksiyon: {payload['likefaksiyon']}")

    # Microscopic
    if payload.get("konsantrasyon"):
        lines.append(f"Konsantrasyon: {payload['konsantrasyon']} mil/ml")
    if payload.get("total_sperm_sayisi"):
        lines.append(f"Toplam Sayı: {payload['total_sperm_sayisi']} milyon")

    # Motility WHO
    mot_who = []
    if payload.get("motilite_pr"):
        mot_who.append(f"PR: %{payload['motilite_pr']}")
    if payload.get("motilite_np"):
        mot_who.append(f"NP: %{payload['motilite_np']}")
    if payload.get("motilite_im"):
        mot_who.append(f"IM: %{payload['motilite_im']}")
    if mot_who:
        lines.append(f"Hareket (WHO): {', '.join(mot_who)}")

    # Motility Old
    mot_old = []
    if payload.get("motilite_4"):
        mot_old.append(f"+4: %{payload['motilite_4']}")
    if payload.get("motilite_3"):
        mot_old.append(f"+3: %{payload['motilite_3']}")
    if payload.get("motilite_2"):
        mot_old.append(f"+2: %{payload['motilite_2']}")
    if mot_old:
        lines.append(f"Hareket (Eski): {', '.join(mot_old)}")

    # Morphology
    morf = []
    if payload.get("morfoloji"):
        morf.append(f"Normal: %{payload['morfoloji']}")
    if payload.get("morfoloji_bas"):
        morf.append(f"Baş: %{payload['morfoloji_bas']}")
    if payload.get("morfoloji_boyun"):
        morf.append(f"Boyun: %{payload['morfoloji_boyun']}")
    if payload.get("morfoloji_kuyruk"):
        morf.append(f"Kuyruk: %{payload['morfoloji_kuyruk']}")
    if morf:
        lines.append(f"Morfoloji: {', '.join(morf)}")

    if payload.get("notlar"):
        lines.append(f"Not: {payload['notlar']}")

    await repo.create_tetkik_sonuc(
        TetkikSonucCreate(
            hasta_id=payload.get("hasta_id"),
            tarih=payload.get("tarih"),
            tetkik_adi="Semen Analizi",
            sonuc="\n".join(lines),
            kategori="Laboratuvar",
        )
    )
    return True


@router.post("/trus_biopsy", response_model=bool)
async def create_trus_biopsy(
    *, db: AsyncSession = Depends(deps.get_db), payload: dict = Body(...)
) -> Any:
    repo = ClinicalRepository(db)
    lines = []

    dims = []
    if payload.get("prostat_boyut_w"):
        dims.append(payload["prostat_boyut_w"])
    if payload.get("prostat_boyut_h"):
        dims.append(payload["prostat_boyut_h"])
    if payload.get("prostat_boyut_l"):
        dims.append(payload["prostat_boyut_l"])
    if dims:
        lines.append(f"Prostat Boyut: {'x'.join(dims)} mm")

    if payload.get("prostat_volum"):
        lines.append(f"Volüm: {payload['prostat_volum']} cc")
    if payload.get("tz_volum"):
        lines.append(f"TZ Volüm: {payload['tz_volum']} cc")
    if payload.get("trus_bulgu"):
        lines.append(f"Bulgular: {payload['trus_bulgu']}")
    if payload.get("trus_tani"):
        lines.append(f"Tanı: {payload['trus_tani']}")

    if payload.get("biopsi_tarih"):
        lines.append(f"Biyopsi Tarihi: {payload['biopsi_tarih']}")
    if payload.get("biopsi_sayi"):
        lines.append(f"Parça Sayısı: {payload['biopsi_sayi']}")

    pat = payload.get("patoloji")
    if pat:
        lines.append(f"Patoloji: {pat.replace('|', ', ')}")

    tum = payload.get("tumor_alanlari")
    if tum:
        lines.append(f"Tümörlü Alanlar: {tum.replace('|', ', ')}")

    await repo.create_tetkik_sonuc(
        TetkikSonucCreate(
            hasta_id=payload.get("hasta_id"),
            tarih=payload.get("tarih"),
            tetkik_adi="TRUS / Prostat Biyopsi",
            sonuc="\n".join(lines),
            kategori="Goruntuleme",
        )
    )
    return True


@router.post("/uroflowmetri", response_model=bool)
async def create_uroflowmetri(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payload: dict = Body(...),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Create uroflowmetri record as a text summary in clinical tetkikler."""
    repo = ClinicalRepository(db)
    lines = []

    if payload.get("qmax"):
        lines.append(f"Qmax: {payload['qmax']} ml/s")
    if payload.get("average_flow"):
        lines.append(f"Ortalama Akım: {payload['average_flow']} ml/s")
    if payload.get("volume"):
        lines.append(f"İşeme Hacmi: {payload['volume']} ml")
    if payload.get("residual_urine"):
        lines.append(f"Rezidü İdrar: {payload['residual_urine']} ml")
    if payload.get("comment"):
        lines.append(f"Yorum: {payload['comment']}")

    await repo.create_tetkik_sonuc(
        TetkikSonucCreate(
            hasta_id=payload.get("hasta_id"),
            tarih=payload.get("tarih"),
            tetkik_adi="Üroflowmetri",
            sonuc="\n".join(lines),
            kategori="Laboratuvar",
        )
    )
    return True


@router.post("/genel/batch", response_model=List[TetkikSonucResponse])
async def create_genel_lab_batch(
    *,
    db: AsyncSession = Depends(deps.get_db),
    payload: List[dict] = Body(...),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Create a batch of lab results."""
    repo = ClinicalRepository(db)
    # Tüm satırlar tek transaction'da yazılır: biri patlarsa hiçbiri kalmaz.
    # Önceden satır başına commit atılıyordu, yarım içe aktarma mümkündü.
    objs = [
        TetkikSonucCreate(
            hasta_id=item.get("hasta_id"),
            tarih=item.get("tarih") or datetime.now(),
            tetkik_adi=item.get("tetkik_adi"),
            sonuc=item.get("sonuc"),
            birim=item.get("birim"),
            referans_araligi=item.get("referans_araligi"),
            sembol=item.get("sembol"),
            kategori="Laboratuvar",
        )
        for item in payload
        if item.get("hasta_id") and item.get("tetkik_adi")
    ]
    return await repo.create_tetkik_sonuc_batch(objs)


@router.delete("/genel/batch", response_model=bool)
async def delete_genel_lab_batch(
    *,
    db: AsyncSession = Depends(deps.get_db),
    ids: List[UUID] = Body(...),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Delete a batch of lab results."""
    repo = ClinicalRepository(db)
    # Tek UPDATE ... WHERE id IN (...) — önceden id başına ayrı UPDATE+COMMIT.
    await repo.delete_tetkik_sonuc_batch(ids)
    return True
