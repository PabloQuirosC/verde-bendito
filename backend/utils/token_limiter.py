"""
Rate limiting para autenticación por token
"""
from datetime import datetime, timedelta
from database.security_config import RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MINUTES, RATE_LIMIT_BAN_MINUTES

# Almacenamiento en memoria de intentos fallidos
login_attempts = {}  # {"attempt_key": [timestamps]}
blocked_tokens = {}  # {"attempt_key": blocked_until_time}

def get_attempt_key() -> str:
    """Retorna una clave única para trackear intentos"""
    # Usar un identificador genérico ya que no hay IP
    return "admin_login"

def record_failed_login() -> tuple[bool, int]:
    """
    Registra un intento fallido de login
    Retorna: (should_block: bool, remaining_attempts: int)
    """
    key = get_attempt_key()
    now = datetime.now()
    
    # Limpiar intentos expirados
    if key in login_attempts:
        login_attempts[key] = [
            ts for ts in login_attempts[key]
            if (now - ts).total_seconds() < RATE_LIMIT_WINDOW_MINUTES * 60
        ]
    else:
        login_attempts[key] = []
    
    # Agregar nuevo intento
    login_attempts[key].append(now)
    
    current_attempts = len(login_attempts[key])
    remaining = max(0, RATE_LIMIT_MAX_ATTEMPTS - current_attempts)
    
    # Si se excedió el límite, bloquear
    should_block = current_attempts >= RATE_LIMIT_MAX_ATTEMPTS
    if should_block:
        blocked_tokens[key] = now + timedelta(minutes=RATE_LIMIT_BAN_MINUTES)
        print(f"⚠️ Admin token bloqueado por {RATE_LIMIT_BAN_MINUTES} minutos")
    
    return should_block, remaining

def is_blocked() -> tuple[bool, int]:
    """
    Verifica si el token está bloqueado
    Retorna: (is_blocked: bool, minutes_remaining: int)
    """
    key = get_attempt_key()
    
    if key not in blocked_tokens:
        return False, 0
    
    blocked_until = blocked_tokens[key]
    now = datetime.now()
    
    if now < blocked_until:
        remaining = (blocked_until - now).total_seconds() / 60
        return True, int(remaining)
    else:
        # Bloqueo expirado
        del blocked_tokens[key]
        if key in login_attempts:
            del login_attempts[key]
        return False, 0

def reset_login_attempts() -> None:
    """Limpia los intentos fallidos después de un login exitoso"""
    key = get_attempt_key()
    if key in login_attempts:
        del login_attempts[key]
    if key in blocked_tokens:
        del blocked_tokens[key]
    print("✅ Intentos de login reiniciados")

def get_login_attempts() -> int:
    """Retorna el número actual de intentos fallidos"""
    key = get_attempt_key()
    if key in login_attempts:
        now = datetime.now()
        # Filtrar intentos expirados
        return len([ts for ts in login_attempts[key] 
                   if (now - ts).total_seconds() < RATE_LIMIT_WINDOW_MINUTES * 60])
    return 0
