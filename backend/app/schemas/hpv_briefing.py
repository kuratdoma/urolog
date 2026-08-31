"""
HPV Briefing Schemas — Pydantic modelleri
Kondiloma/HPV/Siğil tanılı hastalar için AI-destekli klinik özet.
"""

from typing import Optional, List
from pydantic import BaseModel, Field


class TedaviKaydi(BaseModel):
    """Tek bir tedavi/operasyon kaydı."""
    tarih: str = Field(..., description="Tedavi tarihi (DD.MM.YYYY)")
    boyut_tahmini: Optional[str] = Field(None, description="Lezyon boyut tahmini: küçük (<5mm), orta (5-10mm), büyük (>10mm)")
    lezyon_tipi: Optional[str] = Field(None, description="tekil / multipl / çoklu / çok sayıda vb.")
    lokasyon: Optional[str] = Field(None, description="penil, skrotal, perianal, üretral, vb.")
    tedavi_yontemi: str = Field(..., description="kriyoterapi, lazer ablasyon, cerrahi eksizyon, koterizasyon, vb.")
    notlar: Optional[str] = Field(None, description="Ek prosedür notları")


class AsiDurumu(BaseModel):
    """Gardasil aşı durumu özeti."""
    gardasil_doz1: Optional[str] = Field(None, description="1. doz tarihi veya null")
    gardasil_doz2: Optional[str] = Field(None, description="2. doz tarihi veya null")
    gardasil_doz3: Optional[str] = Field(None, description="3. doz tarihi veya null")
    tamamlandi: bool = Field(False, description="Aşı şeması tamamlandı mı")
    notlar: Optional[str] = Field(None, description="Aşı ile ilgili ek notlar")


class NuksAnalizi(BaseModel):
    """Nüks (rekürrens) analizi."""
    toplam_nuks: int = Field(0, description="Toplam nüks sayısı")
    nuks_tarihleri: List[str] = Field(default_factory=list, description="Nüks tarihleri listesi")
    ortalama_aralik_gun: Optional[float] = Field(None, description="Ortalama nüks aralığı (gün)")
    trend: str = Field("yetersiz_veri", description="azalıyor / artıyor / stabil / yetersiz_veri")


class MedikalTedavi(BaseModel):
    """Hastaya verilen medikal tedavi, takviye ve bağışıklık güçlendirici ilaçlar."""
    ilac_verildi: bool = Field(False, description="Hastaya ilaç/takviye reçete edildi veya verildi mi")
    ilaclar: List[str] = Field(default_factory=list, description="Verilen ilaçlar veya takviyeler (örn: VELP, AHCC, Silvershell, Time Health, DeflaGyn vb.)")
    kullanim_sekli: Optional[str] = Field(None, description="İlaç kullanım dozu ve süresi bilgisi")
    notlar: Optional[str] = Field(None, description="Medikal tedavi ile ilgili ek notlar")


class HPVBriefingResponse(BaseModel):
    """AI HPV/Kondilom Hasta Briefing tam yanıtı."""

    # Hasta Profili
    yas: Optional[int] = Field(None, description="Hasta yaşı")
    cinsiyet: Optional[str] = Field(None, description="Cinsiyet")
    partner_durumu: str = Field("Bilgi yok", description="Bekâr, Evli, Partneri var, Bilgi yok")
    sigara_durumu: str = Field("Bilgi yok", description="Aktif (miktar), Bırakmış, Kullanmıyor, Bilgi yok")

    # Kronoloji
    ilk_basvuru_tarihi: Optional[str] = Field(None, description="İlk başvuru tarihi")
    ilk_tani_tarihi: Optional[str] = Field(None, description="İlk HPV/kondilom tanı tarihi")
    ilk_operasyon_tarihi: Optional[str] = Field(None, description="İlk operasyon tarihi")
    toplam_operasyon_sayisi: int = Field(0, description="Toplam operasyon sayısı")
    takip_suresi_ay: Optional[int] = Field(None, description="Takip süresi (ay)")

    # Nüks
    nuks: NuksAnalizi = Field(default_factory=NuksAnalizi)

    # Tedavi Haritası
    tedavi_haritasi: List[TedaviKaydi] = Field(default_factory=list)

    # Aşı
    asi_durumu: AsiDurumu = Field(default_factory=AsiDurumu)

    # Medikal Tedavi / İlaç & Takviye
    medikal_tedavi: MedikalTedavi = Field(default_factory=MedikalTedavi)

    # Önemli Notlar
    onemli_notlar: List[str] = Field(default_factory=list, description="AI tarafından çıkarılan önemli notlar")
    risk_faktorleri: List[str] = Field(default_factory=list, description="Risk faktörleri listesi")

    # Meta
    created_at: Optional[str] = Field(None, description="Briefing oluşturulma zamanı")
    data_sources_count: dict = Field(default_factory=dict, description="Kullanılan veri kaynağı sayıları")
