from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    Date,
    DateTime,
    Text,
    Numeric,
    func,
    ForeignKey,
)
from sqlalchemy.orm import relationship, backref
from sqlalchemy.dialects.postgresql import UUID
from app.models.base_class import Base


class FinansIslem(Base):
    __tablename__ = "finans_islemler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    referans_kodu = Column(String(20), unique=True, nullable=False, index=True)
    hasta_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    muayene_id = Column(UUID(as_uuid=True), index=True, nullable=True)
    tarih = Column(Date, nullable=False)
    islem_tipi = Column(String(20), nullable=False)  # gelir, gider
    tutar = Column(Numeric(12, 2), default=0)
    net_tutar = Column(Numeric(12, 2), nullable=False)
    para_birimi = Column(String(3), default="TRY")
    durum = Column(String(20), default="bekliyor")  # bekliyor, tamamlandi, iptal
    aciklama = Column(Text, nullable=True)
    doktor = Column(String(100), nullable=True)
    kategori_id = Column(Integer, ForeignKey("finans_kategoriler.id"), nullable=True)
    kasa_id = Column(Integer, ForeignKey("kasalar.id"), nullable=True)
    firma_id = Column(Integer, ForeignKey("firmalar.id"), nullable=True)

    # Audit & Soft Delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    vade_tarihi = Column(Date, nullable=True)
    belge_url = Column(String(255), nullable=True)
    iptal_tarihi = Column(DateTime(timezone=True), nullable=True)
    iptal_nedeni = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)

    # Relationships — lazy="raise" forces explicit loading to prevent N+1 queries.
    # Use .options(selectinload(...)) in repository queries that need children.
    satirlar = relationship("FinansIslemSatir", backref=backref("islem", lazy="selectin"), cascade="all, delete-orphan", lazy="raise")
    odemeler = relationship("FinansOdeme", backref=backref("islem", lazy="selectin"), cascade="all, delete-orphan", lazy="raise")


class FinansKategori(Base):
    __tablename__ = "finans_kategoriler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    ad = Column(String(100), nullable=False)
    tip = Column(String(20), nullable=False)
    ust_kategori_id = Column(
        Integer, ForeignKey("finans_kategoriler.id"), nullable=True
    )
    renk = Column(String(7), nullable=True)
    ikon = Column(String(50), nullable=True)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Parent-child self-referential tree relationship.
    alt_kategoriler = relationship(
        "FinansKategori",
        backref=backref("ust_kategori", remote_side=[id], lazy="selectin"),
        foreign_keys=[ust_kategori_id],
        lazy="selectin"
    )


class FinansHizmet(Base):
    __tablename__ = "finans_hizmetler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    ad = Column(String(200), nullable=False)
    kod = Column(String(20), nullable=True)
    kategori = Column(String(100), nullable=True)
    varsayilan_fiyat = Column(Numeric(12, 2), nullable=True)
    para_birimi = Column(String(3), default="TRY")
    kdv_orani = Column(Integer, default=0)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Kasa(Base):
    __tablename__ = "kasalar"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    ad = Column(String(100), nullable=False)
    tip = Column(String(20), nullable=False)
    bakiye = Column(Numeric(12, 2), default=0)
    para_birimi = Column(String(3), default="TRY")
    banka_adi = Column(String(100), nullable=True)
    iban = Column(String(34), nullable=True)
    aktif = Column(Boolean, default=True)
    sira_no = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def is_active(self) -> bool:
        return bool(self.aktif)


class KasaHareket(Base):
    __tablename__ = "kasa_hareketleri"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    kasa_id = Column(Integer, ForeignKey("kasalar.id"), nullable=False)
    hareket_tipi = Column(String(20), nullable=False)  # giris, cikis
    tutar = Column(Numeric(12, 2), nullable=False)
    onceki_bakiye = Column(Numeric(12, 2), nullable=True)
    sonraki_bakiye = Column(Numeric(12, 2), nullable=True)
    aciklama = Column(Text, nullable=True)
    islem_id = Column(Integer, nullable=True)
    tarih = Column(DateTime(timezone=True), server_default=func.now())


class Firma(Base):
    __tablename__ = "firmalar"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    ad = Column(String(200), nullable=False)
    vergi_dairesi = Column(String(100), nullable=True)
    vergi_no = Column(String(20), nullable=True)
    telefon = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    adres = Column(Text, nullable=True)
    yetkili = Column(String(100), nullable=True)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FinansIslemSatir(Base):
    __tablename__ = "finans_islem_satirlari"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    islem_id = Column(Integer, ForeignKey("finans_islemler.id"), index=True, nullable=False)
    hizmet_id = Column(Integer, ForeignKey("finans_hizmetler.id"), nullable=True)
    aciklama = Column(String(255), nullable=True)
    miktar = Column(Numeric(10, 2), default=1)
    birim_fiyat = Column(Numeric(12, 2), nullable=False)
    kdv_orani = Column(Integer, default=0)
    toplam_tutar = Column(Numeric(12, 2), nullable=False)

    @property
    def hizmet_adi(self) -> str:
        return self.aciklama or ""

    @property
    def adet(self) -> int:
        return int(self.miktar) if self.miktar else 1

    @property
    def toplam(self) -> float:
        return float(self.toplam_tutar) if self.toplam_tutar else 0.0

    @property
    def doktor(self):
        return None


class FinansOdeme(Base):
    __tablename__ = "finans_odemeler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    islem_id = Column(Integer, ForeignKey("finans_islemler.id"), index=True, nullable=False)
    kasa_id = Column(Integer, ForeignKey("kasalar.id"), nullable=True)
    odeme_yontemi = Column(String(50), nullable=False)  # Nakit, Kredi Kartı, Havale
    tutar = Column(Numeric(12, 2), nullable=False)
    odeme_tarihi = Column(Date, nullable=False)
    taksit_sayisi = Column(Integer, default=1)
    
    taksitler = relationship("FinansTaksit", backref=backref("odeme", lazy="selectin"), cascade="all, delete-orphan", lazy="raise")


class DuzenliGider(Base):
    """
    Tekrar eden gider şablonu (kira, maaş, abonelik).

    Şablonun kendisi bir gider DEĞİLDİR; ondan dönem dönem FinansIslem üretilir.
    son_uretilen_donem, aynı dönemin iki kez üretilmesini engeller.
    """

    __tablename__ = "duzenli_giderler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    ad = Column(String(200), nullable=False)
    tutar = Column(Numeric(12, 2), nullable=False)
    periyot = Column(String(20), nullable=False, default="aylik")  # aylik, yillik
    ayin_gunu = Column(Integer, nullable=False, default=1)  # 1-28 arası önerilir
    baslangic_tarihi = Column(Date, nullable=False)
    bitis_tarihi = Column(Date, nullable=True)
    son_uretilen_donem = Column(Date, nullable=True)
    kategori_id = Column(Integer, ForeignKey("finans_kategoriler.id"), nullable=True)
    firma_id = Column(Integer, ForeignKey("firmalar.id"), nullable=True)
    kasa_id = Column(Integer, ForeignKey("kasalar.id"), nullable=True)
    aciklama = Column(Text, nullable=True)
    aktif = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class FinansTaksit(Base):
    __tablename__ = "finans_taksitler"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True)
    odeme_id = Column(Integer, ForeignKey("finans_odemeler.id"), index=True, nullable=False)
    taksit_no = Column(Integer, nullable=False)
    tutar = Column(Numeric(12, 2), nullable=False)
    vade_tarihi = Column(Date, nullable=False)
    tahsil_tarihi = Column(Date, nullable=True)
    durum = Column(String(20), default="bekliyor")  # bekliyor, tahsil_edildi
