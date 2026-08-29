class LipusDetails(Base):
    __tablename__ = "lipus_details"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
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
