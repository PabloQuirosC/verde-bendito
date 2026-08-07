from typing import Optional, Any, Dict
from sqlalchemy.orm import Session
from models.auditoria import Auditoria
from datetime import datetime


def log_auditoria(
    db: Session,
    usuario_id: Optional[int] = None,
    nombre_usuario: Optional[str] = None,
    accion: str = "",
    modulo: Optional[str] = None,
    tabla_afectada: Optional[str] = None,
    registro_id: Optional[int] = None,
    datos_antes: Optional[Dict[str, Any]] = None,
    datos_despues: Optional[Dict[str, Any]] = None,
    ip_usuario: Optional[str] = None,
    navegador: Optional[str] = None,
    dispositivo: Optional[str] = None,
):
    try:
        a = Auditoria()
        a.usuario_id = usuario_id
        a.nombre_usuario = nombre_usuario
        a.accion = accion[:100]
        a.modulo = modulo
        a.tabla_afectada = tabla_afectada
        a.registro_id = registro_id
        a.datos_antes = datos_antes
        a.datos_despues = datos_despues
        a.fecha_accion = datetime.utcnow()
        a.ip_usuario = ip_usuario
        a.navegador = navegador
        a.dispositivo = dispositivo
        db.add(a)
        db.commit()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass