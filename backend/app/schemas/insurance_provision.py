from pydantic import BaseModel, ConfigDict
from typing import Optional
from uuid import UUID


class InsuranceProvisionDTO(BaseModel):
    # System identifiers
    hasta_id: Optional[UUID] = None
    appointment_id: Optional[int] = None
    save_to_documents: bool = True

    # Sigorta / İrtibat Bilgileri
    sigorta_sirketi: Optional[str] = ""
    provizyon_no: Optional[str] = ""
    irtibat_tel: Optional[str] = ""
    irtibat_faks: Optional[str] = ""

    # Sağlık Kurumu Bilgileri
    saglik_kurulusu_adi: Optional[str] = "PROF. DR. TAYYAR ALP ÖZKAN"
    kurum_kodu: Optional[str] = ""
    telefon_no: Optional[str] = "262 321 0141"
    faks_no: Optional[str] = ""

    # Sigortalı / Hasta Bilgileri
    sigortali_adi_soyadi: Optional[str] = ""
    dogum_tarihi: Optional[str] = ""
    cinsiyet: Optional[str] = ""  # "Erkek", "Kadın"
    police_no: Optional[str] = ""
    kart_musteri_no: Optional[str] = ""
    tc_kimlik_no: Optional[str] = ""
    eposta: Optional[str] = ""
    basvuru_tarihi: Optional[str] = ""
    planlanan_yatis_cikis_tarihi: Optional[str] = ""

    # Muayene Eden Hekim Tarafından Doldurulacak Bölüm
    sikayeti: Optional[str] = ""
    oykusu: Optional[str] = ""
    sikayet_oyku: Optional[str] = ""  # Geriye dönük uyumluluk için
    sikayet_baslangic_tarihi: Optional[str] = ""
    daha_once_basvuru_var_mi: Optional[str] = ""
    gecmis_oyku_ilaclar: Optional[str] = ""
    fizik_muayene_bulgulari: Optional[str] = ""
    tetkikler_sonuclari: Optional[str] = ""
    giris_tipi: Optional[str] = "Poliklinik"  # Poliklinik, Cerrahi Yatış, Acil, Dahili Yatış
    on_tani_tani: Optional[str] = ""
    icd10_kodu: Optional[str] = ""
    planlanan_tedavi_islem: Optional[str] = ""
    anlasma_durumu: Optional[str] = "Anlaşmalı"  # Anlaşmalı, Anlaşmasız
    operator: Optional[str] = ""
    anestezi: Optional[str] = ""
    asistan: Optional[str] = ""
    tarih: Optional[str] = ""

    model_config = ConfigDict(from_attributes=True)
