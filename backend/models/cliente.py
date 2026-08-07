from sqlalchemy import Column, Integer, String, DateTime, Text, Numeric, Date, ForeignKey
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Cliente(BaseAPP_PAS_COMANDAS):
    __tablename__ = "cliente"

    id = Column(Integer, primary_key=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=True)
    email = Column(String(255), unique=True, nullable=True)
    telefono = Column(String(20), nullable=True)
    cedula_ruc = Column(String(50), unique=True, nullable=True)
    direccion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    pais = Column(String(100), nullable=True)
    limite_credito = Column(Numeric(12, 2), nullable=True)
    saldo_credito = Column(Numeric(12, 2), nullable=True)
    nacimiento = Column(Date, nullable=True)
    usuario_registro_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    fecha_registro = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Integer, nullable=False, default=1)

    # Relaciones
    usuario_registro = relationship("Usuario", foreign_keys=[usuario_registro_id])
    comandas = relationship("Comanda", back_populates="cliente")
    facturas = relationship("Factura", back_populates="cliente")
