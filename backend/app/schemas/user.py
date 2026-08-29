from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.core.permissions import UserRole


class UserBase(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    is_superuser: bool = False
    role: Optional[UserRole] = UserRole.DOCTOR
    clinic_id: Optional[str] = None


class UserCreate(UserBase):
    username: Optional[str] = None
    email: EmailStr  # Email now required for new users
    password: str


class UserUpdate(UserBase):
    password: Optional[str] = None
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
    role: Optional[UserRole] = None
    clinic_id: Optional[str] = None


class UserInDBBase(UserBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class User(UserInDBBase):
    pass


class UserInDB(UserInDBBase):
    hashed_password: str
