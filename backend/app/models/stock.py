from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Numeric,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.models.base_class import Base


class HareketTipi(str, enum.Enum):
    GIRIS = "GIRIS"
    CIKIS = "CIKIS"
    DUZELTME = "DUZELTME"


class StokUrun(Base):
    __tablename__ = "stok_urunler"

    id = Column(Integer, primary_key=True)
    urun_adi = Column(String(255), nullable=False, index=True)
    marka = Column(String(100), nullable=True, index=True)
    urun_tipi = Column(String(50), nullable=True)  # Malzeme, İlaç, Sarf
    birim = Column(String(20), nullable=True)  # Adet, Kutu, Paket
    birim_fiyat = Column(Numeric(10, 2), default=0)  # Son alış / liste fiyatı
    # Ağırlıklı ortalama maliyet — envanter değerlemesi bunun üzerinden yapılır.
    # Her alımda yeniden hesaplanır; son alış fiyatıyla değerleme yapmak
    # fiyat dalgalanmasında stok değerini yanıltıcı gösterir.
    ortalama_maliyet = Column(Numeric(12, 4), default=0)
    mevcut_stok = Column(Integer, default=0)
    min_stok = Column(Integer, default=5)
    barkod = Column(String(50), nullable=True, index=True, unique=True)
    aktif = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # İlişkiler
    # lazy="selectin": base_class.py'deki mapper_configured guard'ı lazy="select"i
    # yasaklıyor — async oturumda ilişkiye erişim örtük IO tetikleyip MissingGreenlet
    # hatasına düşüyor. Bunun bedeli, ürün çekildiğinde alım/hareket geçmişinin de
    # yüklenmesi; bu yüzden listeleme sorguları ilişki attribute'larına hiç dokunmaz,
    # açık join kullanır (bkz. stock_repository.get_products / get_movements).
    alimlar = relationship(
        "StokAlim", back_populates="urun", cascade="all, delete-orphan", lazy="selectin"
    )
    hareketler = relationship(
        "StokHareket", back_populates="urun", cascade="all, delete-orphan", lazy="selectin"
    )


class StokAlim(Base):
    __tablename__ = "stok_alimlari"

    id = Column(Integer, primary_key=True)
    urun_id = Column(Integer, ForeignKey("stok_urunler.id"), nullable=False)
    firma_id = Column(Integer, ForeignKey("firmalar.id"), nullable=True)

    alim_tarihi = Column(DateTime(timezone=True), default=func.now())
    miktar = Column(Integer, nullable=False)
    birim_fiyat = Column(Numeric(10, 2), nullable=False)
    toplam_tutar = Column(Numeric(10, 2), nullable=False)
    fatura_no = Column(String(50), nullable=True)
    notlar = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    urun = relationship("StokUrun", back_populates="alimlar", lazy="selectin")


class StokHareket(Base):
    __tablename__ = "stok_hareketleri"

    id = Column(Integer, primary_key=True)
    urun_id = Column(Integer, ForeignKey("stok_urunler.id"), nullable=False)
    hasta_id = Column(
        UUID(as_uuid=True), ForeignKey("hastalar.id"), nullable=True
    )
    hareket_tipi = Column(String, nullable=False)  # GIRIS, CIKIS, DUZELTME
    miktar = Column(Integer, nullable=False)  # Çıkışlar negatif, girişler pozitif
    islem_tarihi = Column(DateTime(timezone=True), default=func.now())
    kaynak = Column(String(50), nullable=True)  # Satış, Düzeltme, Alım, İade
    kaynak_ref = Column(String(50), nullable=True)  # İşlem ID vb.
    notlar = Column(Text, nullable=True)
    kullanici_id = Column(Integer, nullable=True)  # İşlemi yapan
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    urun = relationship("StokUrun", back_populates="hareketler", lazy="selectin")
