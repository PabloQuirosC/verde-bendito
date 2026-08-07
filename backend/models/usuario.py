from sqlalchemy import Column, Integer, String, DateTime, Identity
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS


class Usuario(BaseAPP_PAS_COMANDAS):
    __tablename__ = "usuario"

    id = Column(
        "id", Integer, Identity(start=1, increment=1), primary_key=True, nullable=False
    )
    nombre = Column("nombre", String(100), nullable=False)
    apellido = Column("apellido", String(100), nullable=False)
    email = Column("email", String(255), nullable=False, unique=True)
    nombre_usuario = Column("nombreusuario", String(100), nullable=False, unique=True)
    password = Column("password", String(200), nullable=False)
    pais = Column("pais", String(10), nullable=True)
    activo = Column(
        "activo",
        Integer,
        nullable=True,
    )
    fecha_ultimo_login = Column("fechaultimologin", DateTime, nullable=True)

    # Relaciones
    usuario_roles = relationship("UsuarioRol", back_populates="usuario")