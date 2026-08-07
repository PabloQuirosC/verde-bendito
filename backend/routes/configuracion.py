from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from models.configuracion import Configuracion
from schemas.operaciones_schemas import ConfiguracionCreate, ConfiguracionResponse
from typing import Optional
from datetime import datetime
import os
import json
from database.manager import DatabaseManager
from database.bases import BaseAPP_PAS_COMANDAS
from models.configuracion_hardware import ConfiguracionHardware
from database.enums import DatabaseType
from utils.auditoria_utils import log_auditoria

router = APIRouter()


@router.get("/", response_model=Optional[ConfiguracionResponse])
def get_configuracion(db: Session = Depends(get_db_app_comandas)):
    # Antes de retornar, intentar migrar hardware.json (una sola vez)
    try:
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        hw_path = os.path.join(project_root, "config", "hardware.json")
        if os.path.exists(hw_path):
            # Asegurar que la tabla exista (no bloquear si falla)
            try:
                BaseAPP_PAS_COMANDAS.metadata.create_all(DatabaseManager.get_engine(DatabaseType.APP_PAS_SISTEMAS))
            except Exception:
                pass
    except Exception:
        # fallback: no bloquear la respuesta por la migración
        pass

    cfg = db.query(Configuracion).filter(Configuracion.activo == 1).order_by(Configuracion.id.desc()).first()
    # Run migration in a safe way
    try:
        hw_file = os.path.join(os.path.dirname(__file__), "..", "config", "hardware.json")
        hw_file = os.path.abspath(hw_file)
        if os.path.exists(hw_file):
            try:
                with open(hw_file, "r", encoding="utf-8") as f:
                    hw = json.load(f)
            except Exception:
                hw = None

            # crear tabla si no existe
            try:
                BaseAPP_PAS_COMANDAS.metadata.create_all(DatabaseManager.get_engine(DatabaseType.APP_PAS_SISTEMAS))
            except Exception:
                pass

            # insertar registro de hardware si se encuentran datos y no existe ya uno similar
            if hw:
                exists_q = db.query(ConfiguracionHardware).order_by(ConfiguracionHardware.id.desc()).first()
                if not exists_q:
                    try:
                        hw_row = ConfiguracionHardware()
                        hw_row.configuracion_id = cfg.id if cfg else None
                        hw_row.printer_name = hw.get("printerName") or hw.get("printer_name")
                        hw_row.printer_address = hw.get("printerAddress") or hw.get("printer_address")
                        hw_row.validator_enabled = 1 if hw.get("validatorEnabled") else 0
                        hw_row.validator_device = hw.get("validatorDevice") or hw.get("validator_device")
                        db.add(hw_row)
                        db.commit()
                    except Exception:
                        db.rollback()
                # eliminar archivo tras migración
                try:
                    os.remove(hw_file)
                except Exception:
                    pass
    except Exception:
        # no bloquear si algo falla
        pass

    if not cfg:
        return None

    # Construir un dict serializable explícito para evitar errores de validación
    resp = {
        "id": cfg.id,
        "nombre_negocio": cfg.nombre_negocio,
        "ruc": cfg.ruc,
        "direccion": cfg.direccion,
        "ciudad": cfg.ciudad,
        "pais": cfg.pais,
        "telefono": cfg.telefono,
        "email": cfg.email,
        "sitio_web": cfg.sitio_web,
        "moneda": cfg.moneda,
        "idioma": cfg.idioma,
        "impuesto": float(cfg.impuesto) if cfg.impuesto is not None else None,
        "horario_apertura": cfg.horario_apertura.isoformat() if cfg.horario_apertura else None,
        "horario_cierre": cfg.horario_cierre.isoformat() if cfg.horario_cierre else None,
        "logo_url": cfg.logo_url,
        "tagline": cfg.tagline,
        "footer": cfg.footer,
        "show_logo": cfg.show_logo,
        "show_tax": cfg.show_tax,
        "show_service": cfg.show_service,
        "show_qr": cfg.show_qr,
        "accent": cfg.accent,
        "fecha_creacion": cfg.fecha_creacion.isoformat() if cfg.fecha_creacion else None,
        "activo": cfg.activo,
    }
    return resp


@router.put("/", response_model=ConfiguracionResponse)
def update_configuracion(data: ConfiguracionCreate, db: Session = Depends(get_db_app_comandas)):
    cfg = db.query(Configuracion).filter(Configuracion.activo == 1).order_by(Configuracion.id.desc()).first()
    if not cfg:
        cfg = Configuracion()
        cfg.fecha_creacion = datetime.utcnow()
    # capture previous state
    datos_antes = None
    if cfg and cfg.id:
        datos_antes = {
            "nombre_negocio": cfg.nombre_negocio,
            "ruc": cfg.ruc,
            "direccion": cfg.direccion,
            "telefono": cfg.telefono,
            "tagline": cfg.tagline,
            "footer": cfg.footer,
        }
    # map fields
    cfg.nombre_negocio = data.nombre_negocio
    cfg.ruc = data.ruc
    cfg.direccion = data.direccion
    cfg.ciudad = data.ciudad
    cfg.pais = data.pais
    cfg.telefono = data.telefono
    cfg.email = data.email
    cfg.sitio_web = data.sitio_web
    cfg.moneda = data.moneda
    cfg.idioma = data.idioma
    cfg.impuesto = data.impuesto
    cfg.horario_apertura = data.horario_apertura
    cfg.horario_cierre = data.horario_cierre
    cfg.logo_url = data.logo_url
    # Personalización de ticket
    cfg.tagline = data.tagline
    cfg.footer = data.footer
    cfg.show_logo = data.show_logo if data.show_logo is not None else cfg.show_logo
    cfg.show_tax = data.show_tax if data.show_tax is not None else cfg.show_tax
    cfg.show_service = data.show_service if data.show_service is not None else cfg.show_service
    cfg.show_qr = data.show_qr if data.show_qr is not None else cfg.show_qr
    cfg.accent = data.accent or cfg.accent
    cfg.activo = 1

    db.add(cfg)
    db.commit()
    db.refresh(cfg)
    # Construir y retornar un dict serializable (igual que en GET) para evitar
    # errores de validación al devolver directamente el ORM.
    resp = {
        "id": cfg.id,
        "nombre_negocio": cfg.nombre_negocio,
        "ruc": cfg.ruc,
        "direccion": cfg.direccion,
        "ciudad": cfg.ciudad,
        "pais": cfg.pais,
        "telefono": cfg.telefono,
        "email": cfg.email,
        "sitio_web": cfg.sitio_web,
        "moneda": cfg.moneda,
        "idioma": cfg.idioma,
        "impuesto": float(cfg.impuesto) if cfg.impuesto is not None else None,
        "horario_apertura": cfg.horario_apertura.isoformat() if cfg.horario_apertura else None,
        "horario_cierre": cfg.horario_cierre.isoformat() if cfg.horario_cierre else None,
        "logo_url": cfg.logo_url,
        "tagline": cfg.tagline,
        "footer": cfg.footer,
        "show_logo": cfg.show_logo,
        "show_tax": cfg.show_tax,
        "show_service": cfg.show_service,
        "show_qr": cfg.show_qr,
        "accent": cfg.accent,
        "fecha_creacion": cfg.fecha_creacion.isoformat() if cfg.fecha_creacion else None,
        "activo": cfg.activo,
    }
    # Registrar auditoría
    try:
        datos_despues = resp
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="UPDATE CONFIGURACION", modulo="configuracion", tabla_afectada="configuracion", registro_id=cfg.id, datos_antes=datos_antes, datos_despues=datos_despues)
    except Exception:
        pass
    return resp
