import os
import uuid
import logging
from urllib.parse import quote
from typing import Any, Optional
from datetime import datetime, date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api import deps
from app.models.user import User
from app.models.documents import HastaDosya
from app.models.appointment import Randevu
from app.models.system import SystemSetting
from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Muayene
from app.schemas.insurance_provision import InsuranceProvisionDTO
from app.services.pdf.pdf_provision_service import PDFProvisionFormService

logger = logging.getLogger(__name__)

router = APIRouter(
    dependencies=[Depends(deps.get_current_user)]
)

@router.get("/prefill", response_model=InsuranceProvisionDTO)
async def get_insurance_provision_prefill(
    hasta_id: Optional[UUID] = Query(None),
    appointment_id: Optional[int] = Query(None),
    exam_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Prefills insurance provision form data from patient, appointment, settings, and clinical examination records.
    """
    target_hasta_id = hasta_id
    appointment_date_str = ""

    if appointment_id:
        randevu_res = await db.execute(select(Randevu).where(Randevu.id == appointment_id))
        randevu = randevu_res.scalars().first()
        if randevu:
            if not target_hasta_id:
                target_hasta_id = randevu.hasta_id
            if randevu.start:
                appointment_date_str = randevu.start.strftime("%d.%m.%Y")

    if not target_hasta_id and exam_id:
        muayene_direct = await db.execute(select(Muayene).where(Muayene.id == exam_id))
        m_obj = muayene_direct.scalars().first()
        if m_obj:
            target_hasta_id = m_obj.hasta_id

    if not target_hasta_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="hasta_id veya appointment_id parametresi gereklidir."
        )

    # Fetch Hasta
    hasta_res = await db.execute(select(Hasta).where(Hasta.id == target_hasta_id))
    hasta = hasta_res.scalars().first()
    if not hasta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hasta bulunamadı."
        )

    # Fetch Muayene: either specific exam_id or latest for patient
    latest_muayene = None
    if exam_id:
        muayene_res = await db.execute(
            select(Muayene).where(
                Muayene.id == exam_id,
                Muayene.is_deleted == False
            )
        )
        latest_muayene = muayene_res.scalars().first()

    if not latest_muayene:
        muayene_res = await db.execute(
            select(Muayene)
            .where(
                Muayene.hasta_id == target_hasta_id,
                Muayene.is_deleted == False
            )
            .order_by(Muayene.tarih.desc().nulls_last())
        )
        latest_muayene = muayene_res.scalars().first()

    today_str = datetime.now().strftime("%d.%m.%Y")
    basvuru_tarihi = appointment_date_str or (
        latest_muayene.tarih.strftime("%d.%m.%Y") if latest_muayene and latest_muayene.tarih else today_str
    )

    # Fetch clinic settings (clinic_name, clinic_phone) from SystemSetting
    settings_res = await db.execute(
        select(SystemSetting).where(SystemSetting.key.in_(["clinic_name", "clinic_phone"]))
    )
    settings_map = {s.key: (s.value or "").strip() for s in settings_res.scalars().all()}
    clinic_name_setting = settings_map.get("clinic_name", "")
    clinic_phone_setting = settings_map.get("clinic_phone", "") or "262 321 0141"

    # Doctor selection: 1. latest_muayene.doktor, 2. hasta.doktor, 3. default
    selected_doctor = ""
    if latest_muayene and latest_muayene.doktor and latest_muayene.doktor.strip():
        selected_doctor = latest_muayene.doktor.strip()
    elif hasta and hasta.doktor and hasta.doktor.strip():
        selected_doctor = hasta.doktor.strip()
    else:
        selected_doctor = "Prof. Dr. Tayyar Alp Özkan"

    kurulus_adi = clinic_name_setting.upper() if clinic_name_setting else selected_doctor.upper()

    # Map cinsiyet to standard options (Erkek / Kadın)
    raw_cins = (hasta.cinsiyet or "").strip().lower()
    if raw_cins in ["e", "erkek", "bay", "m", "male"]:
        mapped_cinsiyet = "Erkek"
    elif raw_cins in ["k", "kadın", "kadin", "bayan", "f", "female"]:
        mapped_cinsiyet = "Kadın"
    else:
        mapped_cinsiyet = hasta.cinsiyet or ""

    # Build separate sikayeti and oykusu
    sikayeti_str = latest_muayene.sikayet.strip() if (latest_muayene and latest_muayene.sikayet) else ""
    oykusu_str = latest_muayene.oyku.strip() if (latest_muayene and latest_muayene.oyku) else ""

    # Legacy composite sikayet_oyku
    sikayet_oyku_parts = []
    if sikayeti_str:
        sikayet_oyku_parts.append(f"Şikayet: {sikayeti_str}")
    if oykusu_str:
        sikayet_oyku_parts.append(f"Öykü: {oykusu_str}")
    sikayet_oyku_str = "\n".join(sikayet_oyku_parts)

    # Build clean gecmis_oyku_ilaclar
    gecmis_parts = []
    if latest_muayene:
        if latest_muayene.ozgecmis and latest_muayene.ozgecmis.strip():
            gecmis_parts.append(f"Özgeçmiş: {latest_muayene.ozgecmis.strip()}")
        if latest_muayene.kullandigi_ilaclar and latest_muayene.kullandigi_ilaclar.strip():
            gecmis_parts.append(f"İlaçlar: {latest_muayene.kullandigi_ilaclar.strip()}")
    gecmis_str = "\n".join(gecmis_parts)

    # Build planlanan_tedavi_islem from tedavi + oneriler (plan) + prosedur
    tedavi_parts = []
    if latest_muayene:
        if latest_muayene.tedavi and latest_muayene.tedavi.strip():
            tedavi_parts.append(latest_muayene.tedavi.strip())
        if latest_muayene.oneriler and latest_muayene.oneriler.strip():
            tedavi_parts.append(f"Plan/Öneri: {latest_muayene.oneriler.strip()}")
        if latest_muayene.prosedur and latest_muayene.prosedur.strip():
            tedavi_parts.append(f"İşlem: {latest_muayene.prosedur.strip()}")
    planlanan_tedavi_str = "\n".join(tedavi_parts)

    # Tetkikler / Sonuç
    tetkikler_str = (latest_muayene.sonuc or latest_muayene.bulgu_notu or "") if latest_muayene else ""

    dto = InsuranceProvisionDTO(
        hasta_id=hasta.id,
        appointment_id=appointment_id,
        save_to_documents=True,
        sigorta_sirketi=getattr(hasta, "ozelsigorta", "") or getattr(hasta, "sigorta", "") or "",
        provizyon_no="",
        irtibat_tel="",
        irtibat_faks="",
        saglik_kurulusu_adi=kurulus_adi,
        kurum_kodu="",
        telefon_no=clinic_phone_setting,
        faks_no=hasta.faks or "",
        sigortali_adi_soyadi=f"{hasta.ad} {hasta.soyad}".strip(),
        dogum_tarihi=hasta.dogum_tarihi.strftime("%d.%m.%Y") if hasta.dogum_tarihi else "",
        cinsiyet=mapped_cinsiyet,
        police_no="",
        kart_musteri_no=hasta.tc_kimlik or "",
        tc_kimlik_no=hasta.tc_kimlik or "",
        eposta=hasta.email or "",
        basvuru_tarihi=basvuru_tarihi,
        planlanan_yatis_cikis_tarihi="",
        sikayeti=sikayeti_str,
        oykusu=oykusu_str,
        sikayet_oyku=sikayet_oyku_str,
        sikayet_baslangic_tarihi="",
        daha_once_basvuru_var_mi="",
        gecmis_oyku_ilaclar=gecmis_str,
        fizik_muayene_bulgulari=latest_muayene.fizik_muayene or latest_muayene.bulgu_notu if latest_muayene else "",
        tetkikler_sonuclari=tetkikler_str,
        giris_tipi="Poliklinik",
        on_tani_tani=latest_muayene.tani1 or latest_muayene.tani_kesin if latest_muayene else "",
        icd10_kodu=latest_muayene.tani1_kodu if latest_muayene else "",
        planlanan_tedavi_islem=planlanan_tedavi_str,
        anlasma_durumu="Anlaşmalı",
        operator=selected_doctor,
        anestezi="",
        asistan="",
        tarih=today_str,
    )

    return dto

@router.post("/generate")
async def generate_insurance_provision_pdf(
    dto: InsuranceProvisionDTO,
    db: AsyncSession = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Any:
    """
    Generates PDF from edited InsuranceProvisionDTO and optionally saves it to patient's documents.
    """
    try:
        service = PDFProvisionFormService(dto)
        pdf_stream = service.generate()

        if dto.save_to_documents and dto.hasta_id:
            filename = f"Provizyon_Formu_{dto.hasta_id}_{uuid.uuid4().hex[:8]}.pdf"
            relative_dir = "static/documents"
            os.makedirs(relative_dir, exist_ok=True)
            full_path = os.path.join(relative_dir, filename)

            # Write PDF content to disk
            pdf_bytes = pdf_stream.getvalue()
            with open(full_path, "wb") as f:
                f.write(pdf_bytes)

            # Create HastaDosya entry in DB
            doc_record = HastaDosya(
                hasta_id=dto.hasta_id,
                tarih=date.today(),
                dosya_tipi="pdf",
                kategori="Özel Sağlık Sigortası Provizyon Formu",
                aciklama=f"Provizyon Formu ({dto.sigorta_sirketi or 'Özel Sigorta'}) - {dto.provizyon_no or ''}".strip(),
                dosya_adi=filename,
                dosya_yolu=full_path,
                created_by=current_user.id if hasattr(current_user, "id") else None,
            )
            db.add(doc_record)
            await db.commit()

            # Reset stream pointer for response
            pdf_stream.seek(0)

        raw_filename = f"Provizyon_Formu_{dto.sigortali_adi_soyadi or 'Hasta'}.pdf".replace(" ", "_")
        encoded_filename = quote(raw_filename)
        return StreamingResponse(
            pdf_stream,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=\"Provizyon_Formu.pdf\"; filename*=UTF-8''{encoded_filename}"},
        )

    except Exception as e:
        logger.error(f"Error generating insurance provision PDF: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"PDF oluşturulurken bir hata meydana geldi: {str(e)}"
        )
