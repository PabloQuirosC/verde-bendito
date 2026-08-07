from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Proveedor(BaseAPP_PAS_COMANDAS):
    __tablename__ = "proveedor"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, nullable=False)
    nombre = Column(String(200), nullable=False, unique=True)
    contacto_nombre = Column(String(100), nullable=True)
    contacto_telefono = Column(String(20), nullable=True)
    contacto_email = Column(String(255), nullable=True)
    direccion = Column(Text, nullable=True)
    condicion_pago = Column(String(100), nullable=True)
    dias_credito = Column(Integer, nullable=True)
    activo = Column(Integer, nullable=False, default=1)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    compras = relationship("Compra", back_populates="proveedor")
    inventarios = relationship("Inventario", back_populates="proveedor")
