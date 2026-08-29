import uuid
from sqlalchemy import Column, Integer, String, Text, DateTime, func, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.models.base_class import Base


class Muayene(Base):
    __tablename__ = "muayeneler"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=False, index=True)
    sikayet = Column(Text, nullable=True)
    oyku = Column(Text, nullable=True)
    bulgu_notu = Column(Text, nullable=True)
    tani1 = Column(String(255), nullable=True)
    tani_kesin = Column(Text, nullable=True)
    tedavi = Column(Text, nullable=True)
    doktor = Column(String(100), nullable=True)

    # Extended Clinical Data (Legacy Migration)
    recete = Column(Text, nullable=True)
    ozgecmis = Column(Text, nullable=True)
    soygecmis = Column(Text, nullable=True)
    kullandigi_ilaclar = Column(Text, nullable=True)
    kan_sulandirici = Column(Integer, default=0, nullable=True)
    aliskanliklar = Column(Text, nullable=True)
    sistem_sorgu = Column(Text, nullable=True)
    ipss_skor = Column(String(50), nullable=True)
    iief_ef_skor = Column(String(50), nullable=True)
    iief_ef_answers = Column(Text, nullable=True)
    fizik_muayene = Column(Text, nullable=True)
    erektil_islev = Column(String(50), nullable=True)
    ejakulasyon = Column(String(50), nullable=True)
    mshq = Column(String(50), nullable=True)
    prosedur = Column(Text, nullable=True)
    allerjiler = Column(Text, nullable=True)

    # Diagnosis Extras
    tani1_kodu = Column(String(50), nullable=True)
    tani2 = Column(String(255), nullable=True)
    tani2_kodu = Column(String(50), nullable=True)
    tani3 = Column(String(255), nullable=True)
    tani3_kodu = Column(String(50), nullable=True)
    tani4 = Column(String(255), nullable=True)
    tani4_kodu = Column(String(50), nullable=True)
    tani5 = Column(String(255), nullable=True)
    tani5_kodu = Column(String(50), nullable=True)
    oneriler = Column(Text, nullable=True)
    sonuc = Column(Text, nullable=True)

    # Physical Exam Details
    tansiyon = Column(String(50), nullable=True)
    ates = Column(String(50), nullable=True)
    kvah = Column(String(50), nullable=True)
    bobrek_sag = Column(String(50), nullable=True)
    bobrek_sol = Column(String(50), nullable=True)
    suprapubik_kitle = Column(String(50), nullable=True)
    ego = Column(String(50), nullable=True)
    rektal_tuse = Column(Text, nullable=True)

    # Symptoms
    disuri = Column(String(10), nullable=True)
    pollakiuri = Column(String(10), nullable=True)
    nokturi = Column(String(10), nullable=True)
    hematuri = Column(String(10), nullable=True)
    genital_akinti = Column(String(10), nullable=True)
    kabizlik = Column(String(10), nullable=True)
    tas_oyku = Column(String(10), nullable=True)
    catallanma = Column(String(10), nullable=True)
    projeksiyon_azalma = Column(String(10), nullable=True)
    kalibre_incelme = Column(String(10), nullable=True)
    idrar_bas_zorluk = Column(String(10), nullable=True)
    kesik_idrar_yapma = Column(String(10), nullable=True)
    terminal_damlama = Column(String(10), nullable=True)
    residiv_hissi = Column(String(10), nullable=True)
    urgency = Column(String(10), nullable=True)
    inkontinans = Column(String(10), nullable=True)

    # Esnek Alanlar (C-3PO/AI vb.)
    extra_fields = Column(JSONB, nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class Operasyon(Base):
    __tablename__ = "operasyonlar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True, index=True)
    ameliyat = Column(String(255), nullable=True)

    pre_op_tani = Column(String(255), nullable=True)
    post_op_tani = Column(String(255), nullable=True)

    ekip = Column(Text, nullable=True)
    hemsire = Column(String(100), nullable=True)
    anestezi_ekip = Column(String(100), nullable=True)
    anestezi_tur = Column(String(50), nullable=True)

    notlar = Column(Text, nullable=True)
    patoloji = Column(Text, nullable=True)
    post_op = Column(Text, nullable=True)
    video_url = Column(String(255), nullable=True)
    hastane_id = Column(String(50), nullable=True)
    asa_skoru = Column(String(50), nullable=True)
    anestezi_sekli = Column(String(100), nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class KlinikNot(Base):
    __tablename__ = "notlar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True, index=True)
    tip = Column(String(100), nullable=True, index=True)
    icerik = Column(Text, nullable=True)
    sembol = Column(String(50), nullable=True)
    etiketler = Column(String(255), nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class TetkikSonuc(Base):
    __tablename__ = "tetkikler"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True, index=True)
    kategori = Column(String(50), nullable=True, index=True)
    tetkik_adi = Column(String(255), nullable=True)
    sonuc = Column(Text, nullable=True)
    birim = Column(String(50), nullable=True)
    referans_araligi = Column(String(100), nullable=True)
    sembol = Column(String(50), nullable=True)
    dosya_yolu = Column(String(255), nullable=True)
    dosya_adi = Column(String(255), nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class FotografArsivi(Base):
    __tablename__ = "fotograflar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    asama = Column(String(50), nullable=True)
    baslik = Column(String(255), nullable=True)
    etiketler = Column(String(255), nullable=True)
    dosya_yolu = Column(String(255), nullable=True)
    dosya_adi = Column(String(255), nullable=True)
    notlar = Column(Text, nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class IstirahatRaporu(Base):
    __tablename__ = "istirahat_raporlari"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    baslangic_tarihi = Column(DateTime, nullable=True)
    bitis_tarihi = Column(DateTime, nullable=True)
    icd_kodu = Column(String(50), nullable=True)
    tani = Column(Text, nullable=True)
    karar = Column(String(100), nullable=True)
    kontrol_tarihi = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class KonsultasyonRaporu(Base):
    __tablename__ = "konsultasyon_raporlari"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    hitap_klinisyen = Column(String(255), nullable=True)
    ozgecmis = Column(Text, nullable=True)
    tani = Column(Text, nullable=True)
    ilaclar = Column(Text, nullable=True)
    sikayet = Column(Text, nullable=True)
    oyku = Column(Text, nullable=True)
    talep = Column(Text, nullable=True)
    konsultasyon_sorular = Column(Text, nullable=True)
    doktor = Column(String(255), nullable=True)
    rapor_metni = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class DurumBildirirRaporu(Base):
    __tablename__ = "durum_bildirir_raporlari"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    tani_bulgular = Column(Text, nullable=True)
    icd_kodu = Column(String(50), nullable=True)
    sonuc_kanaat = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class TibbiMudahaleRaporu(Base):
    __tablename__ = "tibbi_mudahale_raporlari"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    islem_basligi = Column(String(255), nullable=True)
    islem_detayi = Column(Text, nullable=True)
    sonuc_oneriler = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class TrusBiyopsi(Base):
    __tablename__ = "trus_biyopsileri"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    psa_total = Column(String(50), nullable=True)
    rektal_tuse = Column(Text, nullable=True)
    mri_var = Column(Boolean, default=False)
    mri_tarih = Column(DateTime, nullable=True)
    mri_ozet = Column(Text, nullable=True)
    pirads_lezyon_boyut = Column(String(100), nullable=True)
    pirads_lezyon_lokasyon = Column(String(100), nullable=True)
    lokasyonlar = Column(Text, nullable=True)
    prosedur_notu = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class TelefonGorusmesi(Base):
    __tablename__ = "telefon_gorusmeleri"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    tarih = Column(DateTime, nullable=True)
    notlar = Column(Text, nullable=True)
    doktor = Column(String(100), nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class KisiselNot(Base):
    __tablename__ = "kisisel_notlar"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True)
    icerik = Column(Text, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class LipusDetails(Base):
    __tablename__ = "lipus_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    muayene_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    takip_donemi = Column(String(50), nullable=False)  # Tarama, 0. Hafta, 4. Hafta, 8. Hafta, 12. Hafta

    # Tıbbi Özgeçmiş
    ed_tedavisi_6ay = Column(String(255), nullable=True)
    pde5_yaniti = Column(String(100), nullable=True)
    pde5_kullanim = Column(String(255), nullable=True)
    ek_tedavi = Column(String(255), nullable=True)
    alerji_var = Column(Boolean, default=False)
    cerrahi_oyku = Column(Text, nullable=True)
    eslik_eden_hastalik = Column(Text, nullable=True)
    kullanilan_ilaclar = Column(Text, nullable=True)

    # Etkinlik Değerlendirme (Klinik Anketler)
    # IIEF (5 özel soru)
    iief_s1 = Column(Integer, nullable=True)
    iief_s2 = Column(Integer, nullable=True)
    iief_s3 = Column(Integer, nullable=True)
    iief_s4 = Column(Integer, nullable=True)
    iief_s5 = Column(Integer, nullable=True)
    iief_s6 = Column(Integer, nullable=True)
    iief_total = Column(Integer, nullable=True)

    # SEP (Cinsel Yaşam Günlüğü)
    sep2 = Column(String(10), nullable=True)  # Evet / Hayır
    sep3 = Column(String(10), nullable=True)

    # GAQ (Genel Değerlendirme)
    gaq1 = Column(String(10), nullable=True)
    gaq2 = Column(String(10), nullable=True)

    # EHS (Erektil Sertlik Skoru)
    ehs_skor = Column(Integer, nullable=True)  # 0, 1, 2, 3, 4

    # Penil Ereksiyon Memnuniyet Skoru
    memnuniyet_sabah = Column(Integer, nullable=True)
    memnuniyet_cinsel = Column(Integer, nullable=True)
    memnuniyet_mast = Column(Integer, nullable=True)

    # Güvenlik ve Advers Olay
    vas_skor = Column(Integer, nullable=True)  # 0-10
    yan_etki_kizariklik = Column(Boolean, default=False)
    yan_etki_morarma = Column(Boolean, default=False)
    yan_etki_hematuri = Column(Boolean, default=False)
    yan_etki_yanma = Column(Boolean, default=False)
    yan_etki_diger = Column(Text, nullable=True)

    # Audit
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)


class HPVBriefingKaydi(Base):
    __tablename__ = "hpv_briefing_kayitlari"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    hasta_id = Column(UUID(as_uuid=True), index=True, nullable=False)
    briefing_data = Column(JSONB, nullable=False)
    son_islem_tarihi = Column(DateTime, nullable=True)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)

