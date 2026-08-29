from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from app.models.base_class import Base


class UserOAuth(Base):
    __tablename__ = "user_oauth"

    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    provider = Column(
        String, default="google", primary_key=True
    )  # İleride Microsoft vb. için genişletilebilir

    access_token = Column(Text, nullable=False)  # Uzun olabilir, Text daha güvenli
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=False)

    scopes = Column(Text, nullable=True)  # İzin verilen scope'lar

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship
    user = relationship("User", backref=backref("oauth_accounts", lazy="selectin"), lazy="selectin")
