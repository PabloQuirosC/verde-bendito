from sqlalchemy import Column, Integer, String, DateTime, Text, Numeric, Date, Time, Enum, JSON, Index
from sqlalchemy.orm import relationship
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class Configuracion(BaseAPP_PAS_COMANDAS):
    __tablename__ = "configuracion"

    id = Column(Integer, primary_key=True, nullable=False)
    nombre_negocio = Column(String(200), nullable=False)
    ruc = Column(String(50), unique=True, nullable=True)
    direccion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    pais = Column(String(100), nullable=True)
    telefono = Column(String(20), nullable=True)
    email = Column(String(255), nullable=True)
    sitio_web = Column(String(255), nullable=True)
    moneda = Column(String(3), nullable=False, default='USD')
    idioma = Column(String(2), nullable=False, default='es')
    impuesto = Column(Numeric(5, 2), nullable=False, default=13.00)
    horario_apertura = Column(Time, nullable=True)
    horario_cierre = Column(Time, nullable=True)
    logo_url = Column(String(500), nullable=True)
    # Campos para personalización de ticket
    tagline = Column(String(200), nullable=True)
    footer = Column(Text, nullable=True)
    show_logo = Column(Integer, nullable=False, default=1)
    show_tax = Column(Integer, nullable=False, default=1)
    show_service = Column(Integer, nullable=False, default=1)
    show_qr = Column(Integer, nullable=False, default=0)
    accent = Column(String(20), nullable=False, default='verde')
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
    activo = Column(Integer, nullable=False, default=1)
