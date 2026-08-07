from sqlalchemy import Column, Integer, ForeignKey
from database.bases import BaseAPP_PAS_COMANDAS
from sqlalchemy.orm import relationship



class RolPermiso(BaseAPP_PAS_COMANDAS):
    __tablename__ = "rol_permiso"

    rol_id = Column(
        "rolid", Integer, ForeignKey("rol.id"), primary_key=True, nullable=False
    )
    permiso_id = Column(
        "permisoid", Integer, ForeignKey("permiso.id"), primary_key=True, nullable=False
    )

    # Relaciones
    rol = relationship("Rol", back_populates="rol_permisos")
    permiso = relationship("Permiso", back_populates="rol_permisos")

