from sqlalchemy import Column, Integer, String, DateTime
from database.bases import BaseAPP_PAS_COMANDAS
from datetime import datetime


class ConfiguracionHardware(BaseAPP_PAS_COMANDAS):
    __tablename__ = "configuracion_hardware"

    id = Column(Integer, primary_key=True, nullable=False)
    configuracion_id = Column(Integer, nullable=True)
    printer_name = Column(String(200), nullable=True)
    printer_address = Column(String(200), nullable=True)
    validator_enabled = Column(Integer, nullable=True)
    validator_device = Column(String(200), nullable=True)
    fecha_creacion = Column(DateTime, nullable=False, default=datetime.utcnow)
