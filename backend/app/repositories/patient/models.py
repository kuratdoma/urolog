from sqlalchemy import Column, Integer, String, Boolean, DateTime, func, Date, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.models.base_class import Base


class Hasta(Base):
    __tablename__ = "hastalar"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tc_kimlik = Column(String(11), index=True, unique=True, nullable=True)
    ad = Column(String(100), nullable=False, index=True)
    soyad = Column(String(100), nullable=False, index=True)
    dogum_tarihi = Column(Date, nullable=True)
    cinsiyet = Column(String(10), nullable=True)
    cep_tel = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    adres = Column(Text, nullable=True)

    # Extended demographics for legacy compatibility
    dogum_yeri = Column(String(100), nullable=True)
    kan_grubu = Column(String(10), nullable=True)
    medeni_hal = Column(String(20), nullable=True)
    meslek = Column(String(100), nullable=True)

    # Other common fields viewed in details
    doktor = Column(String(100), nullable=True)
    kimlik_notlar = Column(Text, nullable=True)
    protokol_no = Column(String(50), nullable=True, index=True)

    # Full Legacy Fields Support
    ev_tel = Column(String(20), nullable=True)
    is_tel = Column(String(20), nullable=True)
    referans = Column(String(100), nullable=True)
    postakodu = Column(String(10), nullable=True)
    kurum = Column(String(100), nullable=True)
    sigorta = Column(String(100), nullable=True)
    ozelsigorta = Column(String(100), nullable=True)
    cocuk_sayisi = Column(Integer, nullable=True)
    sms_izin = Column(Boolean, default=True)
    email_izin = Column(Boolean, default=True)
    iletisim_kaynagi = Column(String(50), nullable=True)
    iletisim_tercihi = Column(String(50), nullable=True)
    kayit_notu = Column(Text, nullable=True)
    arama_izni = Column(String(10), default="Evet")
    iletisim_yakini_iliski = Column(String(50))
    iletisim_yakini_tel = Column(String(20))
    iletisim_kisi = Column(
        JSONB,
        nullable=True,
        default=list,
        comment="Emergency/alt contact persons [{yakinlik, isim, telefon}]",
    )
    faks = Column(String(20), nullable=True)
    personel_ids = Column(String(255), nullable=True)
    indirim_grubu = Column(String(100), nullable=True)
    dil = Column(String(50), default="Türkçe")
    etiketler = Column(String(255), nullable=True)

    # Audit & Soft Delete
    has_private_notes = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
