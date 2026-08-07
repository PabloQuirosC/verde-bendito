from sqlalchemy import Column, Integer, Numeric, String, DateTime, Text, Enum as SQLEnum, ForeignKey, Date
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Inventario(BaseAPP_PAS_COMANDAS):
    __tablename__ = "inventario"

    id = Column(Integer, primary_key=True, nullable=False)
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    cantidad_anterior = Column(Integer, nullable=True)
    cantidad_nueva = Column(Integer, nullable=True)
    cantidad_cambio = Column(Integer, nullable=True)
    tipo_movimiento = Column(SQLEnum('entrada', 'salida', 'ajuste', 'devolucion', 'perdida', name='inventario_tipo'),
                            nullable=False)
    razon = Column(Text, nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    proveedor_id = Column(Integer, ForeignKey("proveedor.id"), nullable=True)
    compra_id = Column(Integer, ForeignKey("compra.id"), nullable=True)
    fecha_movimiento = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relaciones
    producto = relationship("Producto", back_populates="inventarios")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
    proveedor = relationship("Proveedor", back_populates="inventarios")
    compra = relationship("Compra", back_populates="inventarios")
