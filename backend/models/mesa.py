from sqlalchemy import Column, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Mesa(BaseAPP_PAS_COMANDAS):
    __tablename__ = "mesa"

    id = Column(Integer, primary_key=True, nullable=False)
    numero = Column(Integer, nullable=False, unique=True)
    capacidad = Column(Integer, nullable=True)
    ubicacion = Column(String(100), nullable=True)
    estado = Column(SQLEnum('disponible', 'ocupada', 'reservada', 'mantenimiento', name='mesa_estado'), 
                   nullable=False, default='disponible')
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Integer, nullable=False, default=1)

    # Relaciones
    comandas = relationship("Comanda", back_populates="mesa")
