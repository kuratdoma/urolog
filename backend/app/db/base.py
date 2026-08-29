
# Import all models here for SQLAlchemy and Alembic
from app.models.base_class import Base
from app.models.user import User
from app.models.documents import HastaDosya
from app.models.system import ICDTani, SablonTanim, EkipUyesi, Kurum, Hastane, Cerrah, AnesteziPersoneli, Hemsire
from app.models.appointment import Randevu
from app.models.user_oauth import UserOAuth
from app.models.audit import AuditLog
from app.models.stock import StokUrun, StokAlim, StokHareket
from app.repositories.patient.models import Hasta
from app.repositories.clinical.models import Muayene, Operasyon, TetkikSonuc, TelefonGorusmesi
from app.repositories.finance.models import (
    DuzenliGider,
    FinansKategori,
    FinansHizmet,
    Kasa,
    KasaHareket,
    Firma,
    FinansIslem,
    FinansIslemSatir,
    FinansOdeme,
    FinansTaksit,
)
