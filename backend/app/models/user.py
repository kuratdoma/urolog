from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from app.models.base_class import Base
from app.core.permissions import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)  # KAd
    full_name = Column(String)  # UAd
    hashed_password = Column(String, nullable=True)  # Parola
    email = Column(String, unique=True, index=True, nullable=True)
    role = Column(
        SQLEnum(UserRole, name="userrole", create_constraint=False, native_enum=False),
        default=UserRole.DOCTOR,
        nullable=False,
        index=True,
    )
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    # Multi-clinic support (future extensibility)
    clinic_id = Column(String(50), index=True, nullable=True, default="default")

    # Hidden/Stealth features
    is_hidden = Column(Boolean, default=False)  # Hides from user lists
    skip_audit = Column(Boolean, default=False)  # Skips audit logging

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
