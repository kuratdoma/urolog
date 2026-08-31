from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.models.base_class import Base
from app.repositories.patient.models import Hasta
import enum


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    confirmed = "confirmed"
    unreachable = "unreachable"


class Randevu(Base):
    __tablename__ = "randevular"

    id = Column(Integer, primary_key=True)
    hasta_id = Column(
        UUID(as_uuid=True),
        ForeignKey("hastalar.id"),
        nullable=True,
        index=True,
    )

    title = Column(String, nullable=False)  # Randevu başlığı
    type = Column(String, nullable=True)  # Muayene, Kontrol, Operasyon, etc.

    start = Column(DateTime(timezone=True), nullable=False, index=True)
    end = Column(DateTime(timezone=True), nullable=False)

    status = Column(
        String, default="scheduled", index=True
    )  # scheduled, completed, cancelled, blocked
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    doctor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    doctor_name = Column(String, nullable=True)

    # Oluşturan / Değiştiren Kullanıcı Takibi
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_name = Column(String, nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    updated_by_name = Column(String, nullable=True)

    is_deleted = Column(Integer, default=0, index=True)  # 0: aktif, 1: silindi
    cancel_reason = Column(
        String, nullable=True
    )  # Zaman, Hastalık, Fiyat, Farklı Hekim, Randevu Süresi
    delete_reason = Column(Text, nullable=True)  # Serbest metin gerekçe

    # Google Calendar Sync Fields
    google_event_id = Column(
        String, nullable=True, index=True
    )  # Google tarafındaki event ID
    google_calendar_id = Column(
        String, nullable=True
    )  # Hangi takvime senkronize edildi
    last_synced_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship
    hasta = relationship("Hasta", backref=backref("randevular", lazy="selectin"), lazy="selectin")
    doctor = relationship("User", foreign_keys=[doctor_id], backref=backref("randevular", lazy="selectin"), lazy="selectin")
    created_by_user = relationship("User", foreign_keys=[created_by_id], lazy="selectin")
    updated_by_user = relationship("User", foreign_keys=[updated_by_id], lazy="selectin")


class RandevuTarihce(Base):
    __tablename__ = "randevu_tarihce"

    id = Column(Integer, primary_key=True)
    randevu_id = Column(Integer, ForeignKey("randevular.id", ondelete="CASCADE"), index=True)
    hasta_id = Column(UUID(as_uuid=True), ForeignKey("hastalar.id"), nullable=True, index=True)
    
    # Eski bilgiler
    eski_start = Column(DateTime(timezone=True), nullable=True)
    eski_end = Column(DateTime(timezone=True), nullable=True)
    islem_tipi = Column(String, nullable=False) # 'update' or 'delete'
    
    # İsteğe bağlı ek eski bilgiler (title, status vs) tutulabilir
    eski_title = Column(String, nullable=True)
    eski_status = Column(String, nullable=True)
    
    # Değişikliği yapan kullanıcı
    degistiren_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    degistiren_name = Column(String, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    
    # Relationship
    randevu = relationship("Randevu", backref=backref("tarihce_kayitlari", lazy="selectin"), lazy="selectin")
    hasta = relationship("Hasta", lazy="selectin")

