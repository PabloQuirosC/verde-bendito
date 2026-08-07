from sqlalchemy import Column, Integer, String, DateTime, Numeric, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Comanda(BaseAPP_PAS_COMANDAS):
    __tablename__ = "comanda"

    id = Column(Integer, primary_key=True, nullable=False)
    numero = Column(String(50), nullable=False, unique=True)
    mesa_id = Column(Integer, ForeignKey("mesa.id"), nullable=True)
    cliente_id = Column(Integer, ForeignKey("cliente.id"), nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    fecha_cierre = Column(DateTime, nullable=True)
    usuario_mesero_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    usuario_cajero_id = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    subtotal = Column(Numeric(12, 2), nullable=True)
    impuesto = Column(Numeric(12, 2), nullable=True)
    descuento = Column(Numeric(12, 2), nullable=False, default=0)
    total = Column(Numeric(12, 2), nullable=True)
    estado = Column(SQLEnum('abierta', 'cocina', 'lista', 'pagada', 'cancelada', name='comanda_estado'),
                   nullable=False, default='abierta')
    tipo_cliente = Column(SQLEnum('local', 'para_llevar', 'delivery', name='tipo_cliente'),
                         nullable=False, default='local')
    notas = Column(Text, nullable=True)

    # Relaciones
    mesa = relationship("Mesa", back_populates="comandas")
    cliente = relationship("Cliente", back_populates="comandas")
    usuario_mesero = relationship("Usuario", foreign_keys=[usuario_mesero_id])
    usuario_cajero = relationship("Usuario", foreign_keys=[usuario_cajero_id])
    detalles = relationship("DetalleComanda", back_populates="comanda", cascade="all, delete-orphan")
    pagos = relationship("Pago", back_populates="comanda")
    factura = relationship("Factura", back_populates="comanda", uselist=False)
