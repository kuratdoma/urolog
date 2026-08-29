from typing import Any
from sqlalchemy import Column, String, Integer, Boolean, func
from sqlalchemy.orm import DeclarativeBase, declared_attr, Mapper, RelationshipProperty
from sqlalchemy import event


class Base(DeclarativeBase):
    id: Any
    __name__: str

    # Soft-delete support
    is_deleted = Column(Boolean, default=False, nullable=False)

    # Tablo ismini sınıf isminden otomatik üret (CamelCase -> snake_case çevirici eklenebilir ama şimdilik lowercase)
    @declared_attr
    def __tablename__(cls) -> str:
        return cls.__name__.lower() + "s"  # Basit çoğul eki


# Strict enforcement of selectinload for relationships to avoid async detached errors
@event.listens_for(Mapper, "mapper_configured")
def check_lazy_relationships(mapper, class_):
    for prop in mapper.iterate_properties:
        if isinstance(prop, RelationshipProperty):
            lazy = prop.lazy
            if lazy in ("select", True, "dynamic"):  # Unsafe for async execution
                raise ValueError(
                    f"[Type Safety Error] Async architecture violation in model {class_.__name__}: "
                    f"Relationship '{prop.key}' uses lazy='{lazy}'. "
                    f"Must explicitly use lazy='selectinload' or lazy='joinedload' in UroLOG async design."
                )
