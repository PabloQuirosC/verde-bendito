from sqlalchemy import Column, Integer, ForeignKey
from database.bases import BaseAPP_PAS_COMANDAS
from sqlalchemy.orm import relationship


class UsuarioRol(BaseAPP_PAS_COMANDAS):
    __tablename__ = "usuario_rol"

    usuario_id = Column(
        "usuarioid", Integer, ForeignKey("usuario.id"), primary_key=True, nullable=False
    )
    rol_id = Column(
        "rolid", Integer, ForeignKey("rol.id"), primary_key=True, nullable=False
    )

    # Relaciones
    usuario = relationship("Usuario", back_populates="usuario_roles")
    rol = relationship("Rol", back_populates="usuario_roles")
