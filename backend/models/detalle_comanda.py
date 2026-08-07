from sqlalchemy import Column, Integer, Numeric, String, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class DetalleComanda(BaseAPP_PAS_COMANDAS):
    __tablename__ = "detalle_comanda"

    id = Column(Integer, primary_key=True, nullable=False)
    comanda_id = Column(Integer, ForeignKey("comanda.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    cantidad = Column(Integer, nullable=False, default=1)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=True)
    estado = Column(SQLEnum('pedido', 'cocina', 'listo', 'entregado', 'cancelado', name='detalle_comanda_estado'),
                   nullable=False, default='pedido')
    notas = Column(Text, nullable=True)
    prioridad = Column(String(20), nullable=False, default='media')
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_estado = Column(DateTime, nullable=True)

    # Relaciones
    comanda = relationship("Comanda", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_comanda")
