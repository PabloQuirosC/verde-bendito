from fastapi import Request
import logging
import os
from dotenv import load_dotenv
import hashlib
from datetime import datetime, timedelta
import time
from collections import defaultdict
from fastapi import Header, HTTPException
from jose import jwt
from typing import Dict, Any
import pandas as pd

# Cargar variables de entorno
load_dotenv()
jwt_secret = os.getenv("SECRET_KEY")
algorithm = os.getenv("ALGORITHM")

# Configurar logging (solo consola)
logging.basicConfig(
    level=getattr(logging, os.getenv("LOG_LEVEL", "INFO")),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Control de intentos de login
login_attempts = defaultdict(lambda: {"attempts": 0, "lockout_time": None})
MAX_LOGIN_ATTEMPTS = int(os.getenv("MAX_LOGIN_ATTEMPTS", 3))
LOCKOUT_DURATION_MINUTES = int(os.getenv("LOCKOUT_DURATION_MINUTES", 15))

# Rate limiting simple
rate_limit_storage = defaultdict(list)


def is_rate_limited(ip_address: str) -> bool:
    """Verificar rate limiting"""
    current_time = time.time()
    window_seconds = 60
    max_requests = int(os.getenv("RATE_LIMIT_REQUESTS", 10))

    rate_limit_storage[ip_address] = [
        timestamp
        for timestamp in rate_limit_storage[ip_address]
        if current_time - timestamp < window_seconds
    ]

    if len(rate_limit_storage[ip_address]) >= max_requests:
        return True

    rate_limit_storage[ip_address].append(current_time)
    return False


def is_locked(ip_address: str) -> bool:
    """Verificar si una IP está bloqueada"""
    if ip_address in login_attempts:
        attempts_data = login_attempts[ip_address]
        if attempts_data["attempts"] >= MAX_LOGIN_ATTEMPTS:
            lockout_time = attempts_data["lockout_time"]
            if lockout_time and datetime.now() < lockout_time:
                return True
            else:
                del login_attempts[ip_address]
    return False


def record_failed_attempt(ip_address: str):
    """Registrar intento fallido"""
    login_attempts[ip_address]["attempts"] += 1

    if login_attempts[ip_address]["attempts"] >= MAX_LOGIN_ATTEMPTS:
        lockout_time = datetime.now() + timedelta(minutes=LOCKOUT_DURATION_MINUTES)
        login_attempts[ip_address]["lockout_time"] = lockout_time
        logger.warning(
            f"IP {hash_ip_address(ip_address)} bloqueada por {LOCKOUT_DURATION_MINUTES} minutos"
        )


def record_successful_attempt(ip_address: str):
    """Registrar intento exitoso"""
    if ip_address in login_attempts:
        del login_attempts[ip_address]


def log_security_event(event_type: str, details: dict, ip_address: str):
    """Registrar eventos de seguridad"""
    hashed_ip = hash_ip_address(ip_address)
    logger.warning(
        f"SECURITY_EVENT: {event_type} - IP: {hashed_ip} - Details: {details}"
    )


def hash_ip_address(ip_address: str) -> str:
    """Hashear dirección IP para logs"""
    return hashlib.sha256(ip_address.encode()).hexdigest()[:16]


def get_client_ip(request: Request) -> str:
    """Obtener IP del cliente de forma segura"""
    x_forwarded_for = request.headers.get("X-Forwarded-For")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()

    x_real_ip = request.headers.get("X-Real-IP")
    if x_real_ip:
        return x_real_ip

    return request.client.host if request.client else "unknown"


# --- Función para validar el token ---
def validate_token(authorization: str = Header(None)):
    if not authorization or "Bearer " not in authorization:
        raise HTTPException(
            status_code=401, detail="Token de autenticación no proporcionado"
        )
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, jwt_secret, algorithms=[algorithm])
        return payload  # Asegúrate de guardar el rol en el JWT
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido o expirado")


def generate_token(payload):
    return jwt.encode(payload, jwt_secret, algorithm=algorithm)


# ===== Excel formatting helpers (pandas + XlsxWriter) =====
def _get_report_format() -> Dict[str, Any]:
    return {
        "main_header": {
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "bg_color": "#808080",
            "font_color": "white",
            "border": 1,
        },
        "header": {
            "bold": True,
            "text_wrap": True,
            "align": "center",
            "valign": "vcenter",
            "fg_color": "#B71C1C",
            "font_color": "white",
            "border": 1,
        },
        "cell_alignment": {
            "align": "center",
            "valign": "vcenter",
            "border": 1,
        },
        "total_row": {
            "bold": True,
            "bg_color": "#000000",
            "font_color": "#FFFFFF",
            "align": "center",
            "valign": "vcenter",
        },
        "group_header": {
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "bg_color": "#B71C1C",
            "font_color": "white",
            "border": 1,
        },
        "group_header_gray": {
            "bold": True,
            "align": "center",
            "valign": "vcenter",
            "bg_color": "#808080",
            "font_color": "white",
            "border": 1,
        },
    }


def _auto_adjust_column_widths(df: pd.DataFrame, worksheet) -> None:
    for i, col in enumerate(df.columns):
        try:
            max_data = df[col].astype(str).map(len).max() if not df.empty else 0
        except Exception:
            max_data = 0
        header_len = len(str(col))
        max_len = max(max_data, header_len) + 2
        worksheet.set_column(i, i, max_len)


def apply_basic_sheet_format(df: pd.DataFrame, writer, sheet_name: str) -> None:
    # Requires XlsxWriter engine
    workbook = writer.book
    worksheet = writer.sheets[sheet_name]
    styles = _get_report_format()

    header_fmt = workbook.add_format(styles["header"])  # burgundy header
    cell_fmt = workbook.add_format(styles["cell_alignment"])  # centered cells

    # Hide gridlines, freeze header row
    worksheet.hide_gridlines(2)
    worksheet.freeze_panes(1, 0)

    # Escribir headers con formato en la primera fila (row 0)
    for col_num, value in enumerate(df.columns.values):
        worksheet.write(0, col_num, value, header_fmt)

    # Escribir los datos con formato desde la fila 1
    for row_num in range(len(df)):
        for col_num in range(len(df.columns)):
            value = df.iloc[row_num, col_num]
            worksheet.write(row_num + 1, col_num, value, cell_fmt)

    # Auto width
    _auto_adjust_column_widths(df, worksheet)
