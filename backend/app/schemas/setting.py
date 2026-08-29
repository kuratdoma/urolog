from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class SystemSettingBase(BaseModel):
    key: str
    value: Optional[str] = None
    description: Optional[str] = None


class SystemSettingCreate(SystemSettingBase):
    pass


class SystemSettingUpdate(BaseModel):
    value: Optional[str] = None
    description: Optional[str] = None


class SystemSetting(SystemSettingBase):
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
