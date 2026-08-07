from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from pydantic import BaseModel as PydBaseModel
import json
from pathlib import Path
import socket
import os
from database.manager import DatabaseManager
from database.enums import DatabaseType
from models.configuracion_hardware import ConfiguracionHardware
from database.bases import BaseAPP_PAS_COMANDAS
from utils.auditoria_utils import log_auditoria

router = APIRouter()

CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "hardware.json"
CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)


class HardwareSettings(BaseModel):
    printerName: Optional[str] = None
    printerAddress: Optional[str] = None
    validatorEnabled: Optional[bool] = False
    validatorDevice: Optional[str] = None


DEFAULTS = {
    "printerName": None,
    "printerAddress": None,
    "validatorEnabled": False,
    "validatorDevice": None,
}


def load_config() -> dict:
    # Prefer DB-backed hardware settings if available (migrated)
    try:
        db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
        try:
            row = db.query(ConfiguracionHardware).order_by(ConfiguracionHardware.id.desc()).first()
            if row:
                return {
                    "printerName": row.printer_name,
                    "printerAddress": row.printer_address,
                    "validatorEnabled": bool(row.validator_enabled),
                    "validatorDevice": row.validator_device,
                }
        finally:
            db.close()
    except Exception:
        # fallback to file
        pass

    try:
        if CONFIG_PATH.exists():
            # If file exists but DB had no row, migrate file into DB and delete file
            content = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            try:
                db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
                try:
                    # ensure table
                    BaseAPP_PAS_COMANDAS.metadata.create_all(DatabaseManager.get_engine(DatabaseType.APP_PAS_SISTEMAS))
                    exists = db.query(ConfiguracionHardware).order_by(ConfiguracionHardware.id.desc()).first()
                    if not exists:
                        row = ConfiguracionHardware()
                        row.printer_name = content.get("printerName")
                        row.printer_address = content.get("printerAddress")
                        row.validator_enabled = 1 if content.get("validatorEnabled") else 0
                        row.validator_device = content.get("validatorDevice")
                        db.add(row)
                        db.commit()
                        try:
                            CONFIG_PATH.unlink()
                        except Exception:
                            pass
                finally:
                    db.close()
            except Exception:
                # ignore DB migration errors; return file contents
                pass
            return content
    except Exception:
        pass
    return DEFAULTS.copy()


def save_config(cfg: dict):
    CONFIG_PATH.write_text(json.dumps(cfg, ensure_ascii=False, indent=2), encoding="utf-8")


def save_config_db(cfg: dict):
    try:
        db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
        try:
            row = db.query(ConfiguracionHardware).order_by(ConfiguracionHardware.id.desc()).first()
            if not row:
                row = ConfiguracionHardware()
            row.printer_name = cfg.get("printerName")
            row.printer_address = cfg.get("printerAddress")
            row.validator_enabled = 1 if cfg.get("validatorEnabled") else 0
            row.validator_device = cfg.get("validatorDevice")
            db.add(row)
            db.commit()
        finally:
            db.close()
    except Exception:
        # ignore DB save errors
        pass


@router.get("/")
def get_hardware():
    # Devuelve una configuración combinada que el frontend espera.
    # Cargar hardware (desde DB migrada o archivo)
    hw = load_config()

    # Intentar cargar datos de `configuracion` (ticket/business) para mapear campos útiles
    business = {}
    try:
        db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
        try:
            from models.configuracion import Configuracion as ConfigModel
            cfg = db.query(ConfigModel).filter(ConfigModel.activo == 1).order_by(ConfigModel.id.desc()).first()
            if cfg:
                business = {
                    "businessName": cfg.nombre_negocio,
                    "tagline": cfg.tagline,
                    "address": cfg.direccion,
                    "phone": cfg.telefono,
                    "taxId": cfg.ruc,
                    "footer": cfg.footer,
                    "showLogo": bool(cfg.show_logo),
                    "showTax": bool(cfg.show_tax),
                    "showService": bool(cfg.show_service),
                    "showQR": bool(cfg.show_qr),
                    "accent": cfg.accent,
                    "logoUrl": cfg.logo_url,
                }
        finally:
            db.close()
    except Exception:
        business = {}

    # Merge and return only the fields frontend usa
    merged = {
        "businessName": business.get("businessName") or None,
        "tagline": business.get("tagline") or None,
        "address": business.get("address") or None,
        "phone": business.get("phone") or None,
        "taxId": business.get("taxId") or None,
        "footer": business.get("footer") or None,
        "showLogo": business.get("showLogo") if business.get("showLogo") is not None else True,
        "showTax": business.get("showTax") if business.get("showTax") is not None else True,
        "showService": business.get("showService") if business.get("showService") is not None else True,
        "showQR": business.get("showQR") if business.get("showQR") is not None else False,
        "accent": business.get("accent") or "verde",
        # hardware
        "printerName": hw.get("printerName"),
        "printerAddress": hw.get("printerAddress"),
        "validatorEnabled": hw.get("validatorEnabled"),
        "validatorDevice": hw.get("validatorDevice"),
    }

    return merged


@router.put("/")
def update_hardware(body: HardwareSettings):
    cfg = load_config()
    patch = body.dict(exclude_unset=True)
    cfg.update(patch)
    try:
        save_config(cfg)
        # also persist to DB (best-effort)
        save_config_db(cfg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    # Return merged shape (same as GET) so frontend can update local draft easily
    # load business values from configuracion
    business = {}
    try:
        db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
        try:
            from models.configuracion import Configuracion as ConfigModel
            cfg2 = db.query(ConfigModel).filter(ConfigModel.activo == 1).order_by(ConfigModel.id.desc()).first()
            if cfg2:
                business = {
                    "businessName": cfg2.nombre_negocio,
                    "tagline": cfg2.tagline,
                    "address": cfg2.direccion,
                    "phone": cfg2.telefono,
                    "taxId": cfg2.ruc,
                    "footer": cfg2.footer,
                    "showLogo": bool(cfg2.show_logo),
                    "showTax": bool(cfg2.show_tax),
                    "showService": bool(cfg2.show_service),
                    "showQR": bool(cfg2.show_qr),
                    "accent": cfg2.accent,
                }
        finally:
            db.close()
    except Exception:
        business = {}

    merged = {
        "businessName": business.get("businessName") or None,
        "tagline": business.get("tagline") or None,
        "address": business.get("address") or None,
        "phone": business.get("phone") or None,
        "taxId": business.get("taxId") or None,
        "footer": business.get("footer") or None,
        "showLogo": business.get("showLogo") if business.get("showLogo") is not None else True,
        "showTax": business.get("showTax") if business.get("showTax") is not None else True,
        "showService": business.get("showService") if business.get("showService") is not None else True,
        "showQR": business.get("showQR") if business.get("showQR") is not None else False,
        "accent": business.get("accent") or "verde",
        "printerName": cfg.get("printerName"),
        "printerAddress": cfg.get("printerAddress"),
        "validatorEnabled": cfg.get("validatorEnabled"),
        "validatorDevice": cfg.get("validatorDevice"),
    }
    return {"success": True, "data": merged}


@router.post("/test/printer")
def test_printer(address: Optional[str] = None, name: Optional[str] = None):
    cfg = load_config()
    addr = address or cfg.get("printerAddress")
    if not addr:
        raise HTTPException(status_code=400, detail="No printer address provided")

    # If address looks like IP or host:port, try TCP connect to port 9100 by default
    host = addr
    port = 9100
    if ":" in addr:
        try:
            host, p = addr.rsplit(":", 1)
            port = int(p)
        except Exception:
            pass

    try:
        with socket.create_connection((host, port), timeout=2):
            return {"success": True, "message": f"Conectado a {host}:{port}"}
    except Exception:
        return {"success": False, "message": "No se pudo conectar con la impresora."}


@router.post("/test/validator")
def test_validator(device: Optional[str] = None):
    cfg = load_config()
    dev = device or cfg.get("validatorDevice")
    if not dev:
        raise HTTPException(status_code=400, detail="No validator device provided")

    # Best-effort: if device looks like an IP, try TCP port 80
    if "." in dev:
        host = dev
        try:
            with socket.create_connection((host, 80), timeout=2):
                return {"success": True, "message": f"Conectado a {host}:80"}
        except Exception:
            return {"success": False, "message": "No se pudo validar el dispositivo."}

    # For USB devices, backend cannot validate without specific drivers; return info
    return {"success": False, "message": "Validación de dispositivos USB no implementada en backend; prueba desde la estación POS (WebUSB/Serial)."}



class DeviceValidation(PydBaseModel):
    type: Optional[str] = None  # 'usb' or 'serial'
    vendorId: Optional[int] = None
    productId: Optional[int] = None
    serialNumber: Optional[str] = None
    info: Optional[str] = None


@router.post("/validate")
def validate_device(payload: DeviceValidation):
    """Recibe información enviada desde la estación POS (WebUSB/WebSerial).
    El backend no puede acceder directamente a dispositivos USB remotos, por
    eso el cliente debe realizar la verificación local y enviar los datos aquí.
    Guardamos de forma best-effort en `configuracion_hardware` y retornamos resultado.
    """
    device_repr = None
    try:
        parts = []
        if payload.vendorId is not None:
            parts.append(f"v={payload.vendorId}")
        if payload.productId is not None:
            parts.append(f"p={payload.productId}")
        if payload.serialNumber:
            parts.append(f"s={payload.serialNumber}")
        if payload.info:
            parts.append(f"i={payload.info}")
        device_repr = ";".join(parts) if parts else None

        # Persist best-effort: update or create a ConfiguracionHardware row
        try:
            db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
            try:
                row = db.query(ConfiguracionHardware).order_by(ConfiguracionHardware.id.desc()).first()
                if not row:
                    row = ConfiguracionHardware()
                # store serial or composed repr so admin can see it
                if payload.serialNumber:
                    row.validator_device = payload.serialNumber
                elif device_repr:
                    row.validator_device = device_repr
                row.validator_enabled = 1
                db.add(row)
                db.commit()
                # registrar auditoría
                try:
                    log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="VALIDATE DEVICE", modulo="hardware", tabla_afectada="configuracion_hardware", registro_id=row.id, datos_antes=None, datos_despues={"device": device_repr})
                except Exception:
                    pass
            finally:
                db.close()
        except Exception:
            # ignore DB errors
            pass

        return {"success": True, "message": "Validación recibida en backend.", "device": device_repr}
    except Exception:
        return {"success": False, "message": "No se pudo procesar la validación del dispositivo."}
