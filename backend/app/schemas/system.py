from typing import Optional
from pydantic import BaseModel, ConfigDict


class ICDTaniBase(BaseModel):
    kodu: str
    adi: Optional[str] = None
    ust_kodu: Optional[str] = None
    aktif: Optional[str] = None
    seviye: Optional[str] = None


class ICDTaniCreate(ICDTaniBase):
    pass


class ICDTaniResponse(ICDTaniBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class IlacBase(BaseModel):
    name: str
    barcode: Optional[str] = None
    etkin_madde: Optional[str] = None
    atc_kodu: Optional[str] = None
    fiyat: Optional[str] = None
    firma: Optional[str] = None
    recete_tipi: Optional[str] = None
    aktif: bool = True


class IlacCreate(IlacBase):
    pass


class IlacResponse(IlacBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class BackupResponse(BaseModel):
    name: str
    size: int
    created_at: str
    modified_at: str
