from sqlalchemy import Column, Integer, Numeric, String, Date, ForeignKey
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS


class DetalleCompra(BaseAPP_PAS_COMANDAS):
    __tablename__ = "detalle_compra"

    id = Column(Integer, primary_key=True, nullable=False)
    compra_id = Column(Integer, ForeignKey("compra.id", ondelete="CASCADE"), nullable=False)
    producto_id = Column(Integer, ForeignKey("producto.id"), nullable=False)
    cantidad = Column(Integer, nullable=False)
    precio_unitario = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(12, 2), nullable=True)
    lote = Column(String(100), nullable=True)
    fecha_expiracion = Column(Date, nullable=True)

    # Relaciones
    compra = relationship("Compra", back_populates="detalles")
    producto = relationship("Producto", back_populates="detalles_compra")
