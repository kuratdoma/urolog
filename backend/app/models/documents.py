from sqlalchemy import (
    Column,
    Integer,
    String,
    Date,
    DateTime,
    ForeignKey,
    Text,
    LargeBinary,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base_class import Base


class HastaDosya(Base):
    __tablename__ = "sharded_clinical_dosyalar"

    id = Column(Integer, primary_key=True)
    hasta_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hastalar.id"),
        nullable=False,
    )

    tarih = Column(Date, nullable=True)

    dosya_tipi = Column(String, nullable=True)  # PDF, JPG
    kategori = Column(String, nullable=True)  # Patoloji, Ameliyat
    etiketler = Column(String, nullable=True)  # TAGS
    aciklama = Column(Text, nullable=True)

    dosya_adi = Column(String, nullable=True)
    dosya_yolu = Column(String, nullable=True)

    # Legacy Import için
    legacy_data = Column(LargeBinary, nullable=True)

    kaynak = Column(String, nullable=True)  # ARSIV / DOC
    arsiv_no = Column(String, nullable=True)

    center_id = Column(Integer, default=1)
    is_deleted = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
