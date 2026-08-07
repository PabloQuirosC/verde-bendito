from sqlalchemy import Column, Integer, String, Identity, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS


class Rol(BaseAPP_PAS_COMANDAS):
    __tablename__ = "rol"

    id = Column(
        "id", Integer, Identity(start=1, increment=1), primary_key=True, nullable=False
    )
    nombre_rol = Column("nombrerol", String(100), nullable=False, unique=True)
    descripcion = Column("descripcion", Text, nullable=True)

    # Relaciones
    usuario_roles = relationship("UsuarioRol", back_populates="rol")
    rol_permisos = relationship("RolPermiso", back_populates="rol")
