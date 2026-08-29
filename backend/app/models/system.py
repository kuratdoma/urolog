from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.models.base_class import Base


class ICDTani(Base):
    __tablename__ = "icd_tanilar"

    id = Column(Integer, primary_key=True)
    kodu = Column(String, unique=True, index=True, nullable=False)
    adi = Column(String, index=True, nullable=True)
    ust_kodu = Column(String, nullable=True)
    aktif = Column(String, nullable=True)
    seviye = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SablonTanim(Base):
    __tablename__ = "sablon_tanimlari"

    id = Column(Integer, primary_key=True)
    grup = Column(String, index=True, nullable=False)
    kod = Column(String, index=True, nullable=True)
    icerik = Column(String, nullable=True)
    aktif = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class EkipUyesi(Base):
    __tablename__ = "ekip_uyeleri"

    id = Column(Integer, primary_key=True)
    ad_soyad = Column(String, nullable=False)
    gorev = Column(String, nullable=True)
    aktif = Column(Boolean, default=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True)
    value = Column(
        String, nullable=True
    )  # JSON value stored as string if needed, or simple text
    description = Column(String, nullable=True)
    updated_at = Column(
        DateTime(timezone=True), onupdate=func.now(), server_default=func.now()
    )


class IlacTanim(Base):
    __tablename__ = "ilac_tanimlari"

    id = Column(Integer, primary_key=True)
    name = Column(String, index=True, nullable=False)
    barcode = Column(String, index=True, nullable=True)  # Barkod

    # Generic fields that might come from the excel
    etkin_madde = Column(String, nullable=True)
    atc_kodu = Column(String, nullable=True)
    fiyat = Column(String, nullable=True)
    firma = Column(String, nullable=True)
    recete_tipi = Column(String, nullable=True)  # Normal, Kırmızı, Yeşil vs.

    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), onupdate=func.now(), server_default=func.now()
    )


class Kurum(Base):
    __tablename__ = "kurumlar"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Meslek(Base):
    __tablename__ = "meslekler"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class OzelSigorta(Base):
    __tablename__ = "ozel_sigortalar"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnesteziTipi(Base):
    __tablename__ = "anestezi_tipleri"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RandevuTuru(Base):
    __tablename__ = "randevu_turleri"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    sure = Column(Integer, default=30)  # dakika
    renk = Column(String(7), default="#3b82f6")  # hex code
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class BiyopsiSablonu(Base):
    __tablename__ = "biyopsi_sablonlari"
    id = Column(Integer, primary_key=True)
    no = Column(Integer, nullable=True)  # 1, 2, 3...
    lokasyon = Column(String, nullable=False)  # Sağ Bazal vb.
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Doktor(Base):
    __tablename__ = "doktorlar"
    id = Column(Integer, primary_key=True)
    ad_soyad = Column(String, index=True, nullable=False)
    brans = Column(String, nullable=True)
    diploma_no = Column(String, nullable=True)
    tescil_no = Column(String, nullable=True)
    uzmanlik_tescil_no = Column(String, nullable=True)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TakipKonusu(Base):
    __tablename__ = "takip_konulari"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TetkikTanim(Base):
    __tablename__ = "tetkik_tanimlari"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    grup = Column(String, index=True, nullable=True)  # RADYOLOJI, LAB, etc.
    sira = Column(Integer, default=0)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ReceteSablonu(Base):
    __tablename__ = "recete_sablonlari"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    icerik = Column(String, nullable=True)  # JSON string: [{name: '', dose: '', etc}]
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), onupdate=func.now(), server_default=func.now()
    )


class Hastane(Base):
    __tablename__ = "hastaneler"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Cerrah(Base):
    __tablename__ = "cerrahlar"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AnesteziPersoneli(Base):
    __tablename__ = "anestezi_personelleri"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Hemsire(Base):
    __tablename__ = "hemsireler"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Asistan(Base):
    __tablename__ = "asistanlar"
    id = Column(Integer, primary_key=True)
    ad = Column(String, index=True, nullable=False)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
