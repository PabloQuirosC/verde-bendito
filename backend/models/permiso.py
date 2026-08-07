from sqlalchemy import Column, Integer, String, Identity
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS


class Permiso(BaseAPP_PAS_COMANDAS):
    __tablename__ = "permiso"

    id = Column(
        "id", Integer, Identity(start=1, increment=1), primary_key=True, nullable=False
    )
    nombre_permiso = Column("nombrepermiso", String(100), nullable=False, unique=True)
    descripcion = Column("descripcion", String(255), nullable=True)
    modulo = Column("modulo", String(50), nullable=True)

    # Relaciones
    rol_permisos = relationship("RolPermiso", back_populates="permiso")