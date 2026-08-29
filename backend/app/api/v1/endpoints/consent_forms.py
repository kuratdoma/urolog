"""
Consent Forms API — Onam Formu Endpoint'leri

- GET  /consent-forms                           → Mevcut onam formu listesi
- GET  /consent-forms/{form_id}/preview/{hasta_id} → Hastaya özel kişiselleştirilmiş PDF
"""

import os
from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, Body
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api import deps
from app.models.system import Doktor
from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Muayene
from app.services.consent_form_service import ConsentFormService, PatientConsentData

router = APIRouter(dependencies=[Depends(deps.get_current_user)])

# Singleton servis instance
_service = ConsentFormService()


@router.get("/consent-forms", response_model=List[dict])
async def list_consent_forms(
    current_user=Depends(deps.get_current_user),
) -> Any:
    """
    Mevcut onam formlarını listeler.
    Kategoriye göre gruplanmış form listesi döndürür.
    """
    forms = _service.list_forms()
    return forms

@router.post("/consent-forms")
async def upload_consent_form(
    file: UploadFile = File(...),
    display_name: str = Form(...),
    category: str = Form(...),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Yeni onam formu yükler."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Sadece PDF dosyaları yüklenebilir")
        
    content = await file.read()
    
    # Güvenli dosya adı oluştur (Directory traversal önlemi)
    safe_filename = os.path.basename(file.filename)
    filename = safe_filename.replace(" ", "_")
    
    result = _service.add_form(content, filename, display_name, category)
    return result

from pydantic import BaseModel

class ConsentFormUpdate(BaseModel):
    display_name: str
    category: str

class ConsentFormOrder(BaseModel):
    id: str
    order_index: int

# IMPORTANT: /reorder must be defined BEFORE /{form_id} routes
# to prevent FastAPI matching 'reorder' as a form_id path param.
@router.put("/consent-forms/reorder")
async def reorder_consent_forms(
    orders: List[ConsentFormOrder] = Body(...),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Onam formlarının manuel sıralamasını günceller."""
    success = _service.update_order([o.dict() for o in orders])
    if not success:
        raise HTTPException(status_code=400, detail="Sıralama güncellenemedi")
    return {"status": "ok"}

@router.delete("/consent-forms/{form_id}")
async def delete_consent_form(
    form_id: str,
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Onam formunu siler."""
    success = _service.delete_form(form_id)
    if not success:
        raise HTTPException(status_code=404, detail="Onam formu bulunamadı")
    return {"status": "ok"}

@router.put("/consent-forms/{form_id}")
async def update_consent_form(
    form_id: str,
    data: ConsentFormUpdate,
    current_user=Depends(deps.get_current_user),
) -> Any:
    """Onam formunu günceller."""
    result = _service.update_form(form_id, data.display_name, data.category)
    if not result:
        raise HTTPException(status_code=404, detail="Onam formu bulunamadı")
    return result



@router.get("/consent-forms/{form_id}/preview/{hasta_id}")
async def preview_consent_form(
    form_id: str,
    hasta_id: str,
    doktor_id: Optional[int] = Query(None, description="Doktor ID"),
    tarih: Optional[str] = Query(None, description="Tarih (DD/MM/YYYY formatında)"),
    saat: Optional[str] = Query(None, description="Saat (HH:MM formatında)"),
    db: AsyncSession = Depends(deps.get_db),
    current_user=Depends(deps.get_current_user),
) -> Any:
    """
    Hastaya özel kişiselleştirilmiş onam formu PDF'ini döndürür.

    - form_id: Onam formu ID'si (manifest'teki id)
    - hasta_id: Hasta UUID'si
    - doktor_id: (Opsiyonel) Doktor ID'si. Verilmezse hastanın kayıtlı doktoru kullanılır.
    - tarih: (Opsiyonel) Tarih. Verilmezse şu anki tarih kullanılır.
    - saat: (Opsiyonel) Saat. Verilmezse şu anki saat kullanılır.
    """
    # 1. Hasta bilgilerini çek
    result = await db.execute(select(Hasta).filter(Hasta.id == hasta_id))
    hasta = result.scalars().first()
    if not hasta:
        raise HTTPException(status_code=404, detail="Hasta bulunamadı")

    # 2. Doktor bilgisini belirle
    doktor_adi = ""
    if doktor_id:
        result = await db.execute(select(Doktor).filter(Doktor.id == doktor_id))
        doktor = result.scalars().first()
        if doktor:
            doktor_adi = doktor.ad_soyad
    elif hasta.doktor:
        # Hasta kaydındaki doktor bilgisini kullan
        doktor_adi = hasta.doktor

    # 3. Tarih/Saat belirle
    now = datetime.now()
    if not tarih:
        tarih = now.strftime("%d/%m/%Y")
    if not saat:
        saat = now.strftime("%H:%M")

    # 4. Hasta adı soyadı ve protokol
    hasta_adi_soyadi = f"{hasta.ad or ''} {hasta.soyad or ''}".strip()
    protokol_no = hasta.protokol_no or ""

    # 4.5. Son klinik verileri (Muayene) çek
    muayene_result = await db.execute(
        select(Muayene)
        .filter(Muayene.hasta_id == hasta.id, Muayene.is_deleted == False)
        .order_by(Muayene.tarih.desc())
        .limit(1)
    )
    son_muayene = muayene_result.scalars().first()

    def format_aliskanliklar(raw: Optional[str]) -> Optional[str]:
        if not raw:
            return None
        parts = raw.split(";")
        filled = []
        for p in parts:
            p = p.strip()
            if ":" in p:
                k, v = p.split(":", 1)
                if v.strip() and k.strip().lower() != "sosyal":
                    filled.append(p)
            else:
                if p:
                    filled.append(p)
        return "; ".join(filled) if filled else None

    # 5. PDF oluştur
    patient_data = PatientConsentData(
        hasta_adi_soyadi=hasta_adi_soyadi,
        tc_kimlik=hasta.tc_kimlik,
        dogum_tarihi=hasta.dogum_tarihi.strftime("%d/%m/%Y") if hasta.dogum_tarihi else None,
        protokol_no=protokol_no,
        doktor_adi_soyadi=doktor_adi,
        tarih=tarih,
        saat=saat,
        sikayet=son_muayene.sikayet if son_muayene else None,
        ozgecmis=son_muayene.ozgecmis if son_muayene else None,
        ilaclar=son_muayene.kullandigi_ilaclar if son_muayene else None,
        allerjiler=son_muayene.allerjiler if son_muayene else None,
        sigara_durumu=format_aliskanliklar(son_muayene.aliskanliklar) if son_muayene else None,
        karar=son_muayene.sonuc if son_muayene else None,
    )

    try:
        pdf_stream = _service.generate(form_id, patient_data)
        _service.increment_usage(form_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Form display_name'ini filename olarak kullan
    forms = _service.list_forms()
    form_name = form_id
    for f in forms:
        if f["id"] == form_id:
            form_name = f["display_name"]
            break

    filename = f"Onam_{hasta_adi_soyadi}_{form_name}.pdf".replace(" ", "_")
    
    from urllib.parse import quote
    filename_encoded = quote(filename)

    # Otomatik olarak hastanın belgelerine kaydet (KVKK onam formu hariç)
    if form_id != "kvkk-onam-formu":
        import uuid
        import os
        from app.models.documents import HastaDosya

        pdf_bytes = pdf_stream.getvalue()
        unique_filename = f"{uuid.uuid4()}.pdf"
        os.makedirs("static/documents", exist_ok=True)
        file_path = f"static/documents/{unique_filename}"
        
        with open(file_path, "wb") as f:
            f.write(pdf_bytes)

        # Aynı isimde belge varsa güncelle, yoksa yeni oluştur
        existing_doc_result = await db.execute(
            select(HastaDosya)
            .filter(HastaDosya.hasta_id == hasta_id)
            .filter(HastaDosya.dosya_adi == filename)
        )
        existing_doc = existing_doc_result.scalars().first()

        if existing_doc:
            # Eski fiziksel dosyayı silmeyi dene
            try:
                old_path = existing_doc.dosya_yolu.lstrip("/") if existing_doc.dosya_yolu.startswith("/") else existing_doc.dosya_yolu
                if os.path.exists(old_path):
                    os.remove(old_path)
            except Exception:
                pass
            existing_doc.dosya_yolu = f"/static/documents/{unique_filename}"
            existing_doc.tarih = now.date()
            existing_doc.aciklama = f"Otomatik güncellendi ({now.strftime('%d/%m/%Y %H:%M')})"
        else:
            new_doc = HastaDosya(
                hasta_id=hasta_id,
                tarih=now.date(),
                kategori="Onam",
                dosya_tipi="application/pdf",
                dosya_adi=filename,
                dosya_yolu=f"/static/documents/{unique_filename}",
                aciklama="Sistem tarafından otomatik oluşturuldu",
                kaynak="SISTEM"
            )
            db.add(new_doc)
        
        await db.commit()

    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename*=utf-8''{filename_encoded}",
        },
    )
