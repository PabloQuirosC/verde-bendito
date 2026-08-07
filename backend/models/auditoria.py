from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Auditoria(BaseAPP_PAS_COMANDAS):
    __tablename__ = "auditoria"

    id = Column(Integer, primary_key=True, nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    nombre_usuario = Column(String(100), nullable=True)
    accion = Column(String(100), nullable=False)
    modulo = Column(String(100), nullable=True)
    tabla_afectada = Column(String(100), nullable=True)
    registro_id = Column(Integer, nullable=True)
    datos_antes = Column(JSON, nullable=True)
    datos_despues = Column(JSON, nullable=True)
    fecha_accion = Column(DateTime, nullable=False, default=datetime.utcnow)
    ip_usuario = Column(String(45), nullable=True)
    navegador = Column(String(255), nullable=True)
    dispositivo = Column(String(100), nullable=True)

    # Relaciones
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
