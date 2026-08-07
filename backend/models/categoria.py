from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Categoria(BaseAPP_PAS_COMANDAS):
    __tablename__ = "categoria"
 
    id = Column(Integer, primary_key=True, nullable=False)
    nombre = Column(String(100), nullable=False, unique=True)
    emoji = Column(String(10), nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Integer, nullable=False, default=1)

    # Relaciones
    productos = relationship("Producto", back_populates="categoria")
