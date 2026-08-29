from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from datetime import datetime


class LipusIIEFSchema(BaseModel):
    """
    Isolated 5-question IIEF schema for Lipus WBL-ED tracking.
    """
    iief_s1: Optional[int] = None
    iief_s2: Optional[int] = None
    iief_s3: Optional[int] = None
    iief_s4: Optional[int] = None
    iief_s5: Optional[int] = None
    iief_s6: Optional[int] = None
    iief_total: Optional[int] = None


class LipusDetailsBase(BaseModel):
    muayene_id: UUID
    takip_donemi: str  # Tarama, 0. Hafta, 4. Hafta, 8. Hafta, 12. Hafta

    # Tıbbi Özgeçmiş
    ed_tedavisi_6ay: Optional[str] = None
    pde5_yaniti: Optional[str] = None
    pde5_kullanim: Optional[str] = None
    ek_tedavi: Optional[str] = None
    alerji_var: Optional[bool] = False
    cerrahi_oyku: Optional[str] = None
    eslik_eden_hastalik: Optional[str] = None
    kullanilan_ilaclar: Optional[str] = None

    # Klinik Anketler (Mapped from individual columns)
    iief_s1: Optional[int] = None
    iief_s2: Optional[int] = None
    iief_s3: Optional[int] = None
    iief_s4: Optional[int] = None
    iief_s5: Optional[int] = None
    iief_s6: Optional[int] = None
    iief_total: Optional[int] = None

    sep2: Optional[str] = None
    sep3: Optional[str] = None
    gaq1: Optional[str] = None
    gaq2: Optional[str] = None
    ehs_skor: Optional[int] = None

    memnuniyet_sabah: Optional[int] = None
    memnuniyet_cinsel: Optional[int] = None
    memnuniyet_mast: Optional[int] = None

    # Güvenlik
    vas_skor: Optional[int] = None
    yan_etki_kizariklik: Optional[bool] = False
    yan_etki_morarma: Optional[bool] = False
    yan_etki_hematuri: Optional[bool] = False
    yan_etki_yanma: Optional[bool] = False
    yan_etki_diger: Optional[str] = None


class LipusDetailsCreate(LipusDetailsBase):
    pass


class LipusDetailsUpdate(BaseModel):
    takip_donemi: Optional[str] = None
    ed_tedavisi_6ay: Optional[str] = None
    pde5_yaniti: Optional[str] = None
    pde5_kullanim: Optional[str] = None
    ek_tedavi: Optional[str] = None
    alerji_var: Optional[bool] = None
    cerrahi_oyku: Optional[str] = None
    eslik_eden_hastalik: Optional[str] = None
    kullanilan_ilaclar: Optional[str] = None
    iief_s1: Optional[int] = None
    iief_s2: Optional[int] = None
    iief_s3: Optional[int] = None
    iief_s4: Optional[int] = None
    iief_s5: Optional[int] = None
    iief_s6: Optional[int] = None
    iief_total: Optional[int] = None
    sep2: Optional[str] = None
    sep3: Optional[str] = None
    gaq1: Optional[str] = None
    gaq2: Optional[str] = None
    ehs_skor: Optional[int] = None
    memnuniyet_sabah: Optional[int] = None
    memnuniyet_cinsel: Optional[int] = None
    memnuniyet_mast: Optional[int] = None
    vas_skor: Optional[int] = None
    yan_etki_kizariklik: Optional[bool] = None
    yan_etki_morarma: Optional[bool] = None
    yan_etki_hematuri: Optional[bool] = None
    yan_etki_yanma: Optional[bool] = None
    yan_etki_diger: Optional[str] = None


class LipusDetailsResponse(LipusDetailsBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class LipusDashboardItem(LipusDetailsBase):
    """
    Schema for the trend dashboard items containing full details and exam date.
    """
    id: UUID
    tarih: datetime
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

