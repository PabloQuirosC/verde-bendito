from sqlalchemy import Column, Integer, Numeric, String, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Pago(BaseAPP_PAS_COMANDAS):
    __tablename__ = "pago"

    id = Column(Integer, primary_key=True, nullable=False)
    comanda_id = Column(Integer, ForeignKey("comanda.id"), nullable=False)
    monto = Column(Numeric(12, 2), nullable=False)
    tipo_pago = Column(SQLEnum('efectivo', 'tarjeta_debito', 'tarjeta_credito', 'transferencia', 'cheque', 'credito', 'otro', name='tipo_pago'),
                      nullable=False, default='efectivo')
    referencia_pago = Column(String(100), nullable=True)
    banco = Column(String(100), nullable=True)
    ultimos_digitos = Column(String(10), nullable=True)
    cuotas = Column(Integer, nullable=False, default=1)
    fecha_pago = Column(DateTime, nullable=False, default=datetime.utcnow)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    notas = Column(Text, nullable=True)

    # Relaciones
    comanda = relationship("Comanda", back_populates="pagos")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
