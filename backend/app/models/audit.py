from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from sqlalchemy import event
from app.models.base_class import Base
from app.utils.code_generator import generate_unique_code


class AuditLog(Base):
    __tablename__ = "audit_logs"

    # 6-char alphanumeric code as Primary Key
    id = Column(String(6), primary_key=True, default=generate_unique_code)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(
        String, nullable=False, index=True
    )  # e.g. "USER_LOGIN", "PATIENT_VIEW"

    # Target resource information
    resource_type = Column(
        String, nullable=True
    )  # e.g. "patient", "finance_transaction"
    resource_id = Column(String, nullable=True)  # ID of the resource

    # Context
    details = Column(JSON, nullable=True)  # Old/New values, diffs
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    user = relationship("User", backref=backref("audit_logs", lazy="selectin"), lazy="selectin")


# SQLAlchemy seviyesinde Immutable (Değiştirilemez) koruması
@event.listens_for(AuditLog, "before_update")
def receive_before_update(mapper, connection, target):
    raise Exception(
        "Veri Bütünlüğü İhlali (Tampering Attempt): Audit Log kayıtları teknik olarak GÜNCELLENEMEZ."
    )


@event.listens_for(AuditLog, "before_delete")
def receive_before_delete(mapper, connection, target):
    raise Exception(
        "Veri Bütünlüğü İhlali (Tampering Attempt): Audit Log kayıtları teknik olarak SİLİNEMEZ."
    )
