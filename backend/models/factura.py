from sqlalchemy import Column, Integer, String, DateTime, Numeric, Enum as SQLEnum, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Factura(BaseAPP_PAS_COMANDAS):
    __tablename__ = "factura"

    id = Column(Integer, primary_key=True, nullable=False)
    numero_factura = Column(String(50), nullable=False, unique=True)
    comanda_id = Column(Integer, ForeignKey("comanda.id"), nullable=False)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=True)
    usuario_id = Column(Integer, ForeignKey("usuario.id"), nullable=False)
    fecha_emision = Column(DateTime, nullable=False, default=datetime.utcnow)
    subtotal = Column(Numeric(12, 2), nullable=True)
    impuesto = Column(Numeric(12, 2), nullable=True)
    total = Column(Numeric(12, 2), nullable=False)
    estado_pago = Column(SQLEnum('pagada', 'pendiente', 'vencida', 'cancelada', name='estado_pago_factura'),
                        nullable=False, default='pagada')
    fecha_vencimiento = Column(Date, nullable=True)
    notas = Column(Text, nullable=True)
    xml_path = Column(String(255), nullable=True)
    pdf_path = Column(String(255), nullable=True)

    # Relaciones
    comanda = relationship("Comanda", back_populates="factura")
    cliente = relationship("Cliente", back_populates="facturas")
    usuario = relationship("Usuario", foreign_keys=[usuario_id])
