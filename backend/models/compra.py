from sqlalchemy import Column, Integer, String, DateTime, Numeric, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Compra(BaseAPP_PAS_COMANDAS):
    __tablename__ = "compra"

    id = Column(Integer, primary_key=True, nullable=False)
    numero = Column(String(50), nullable=False, unique=True)
    fecha = Column(DateTime, nullable=False, default=datetime.utcnow)
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=True)
    impuesto = Column(Numeric(12, 2), nullable=True)
    total = Column(Numeric(12, 2), nullable=False)
    estado = Column(SQLEnum('pendiente', 'confirmada', 'entregada', 'cancelada', name='compra_estado'),
                   nullable=False, default='pendiente')
    fecha_entrega_esperada = Column(String(10), nullable=True)  # DATE format
    fecha_entrega = Column(DateTime, nullable=True)
    descripcion = Column(Text, nullable=True)

    # Relaciones
    proveedor = relationship("Proveedor", back_populates="compras")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    detalles = relationship("DetalleCompra", back_populates="compra", cascade="all, delete-orphan")
    inventarios = relationship("Inventario", back_populates="compra")
