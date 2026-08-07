from sqlalchemy import Column, Integer, String, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Producto(BaseAPP_PAS_COMANDAS):
    __tablename__ = "producto"

    id = Column(Integer, primary_key=True, nullable=False)
    nombre = Column(String(200), nullable=False)
    categoria_id = Column(Integer, ForeignKey("categoria.id"), nullable=False)
    precio = Column(Numeric(10, 2), nullable=False)
    stock = Column(Integer, nullable=False, default=0)
    stock_minimo = Column(Integer, nullable=False, default=5)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Integer, nullable=False, default=1)

    # Relaciones
    categoria = relationship("Categoria", back_populates="productos")
    detalles_comanda = relationship("DetalleComanda", back_populates="producto")
    detalles_compra = relationship("DetalleCompra", back_populates="producto")
    inventarios = relationship("Inventario", back_populates="producto")
