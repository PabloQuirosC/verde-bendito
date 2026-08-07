"""
Configuración de seguridad - CRÍTICO: Admin Token Authentication
⚠️ NUNCA hardcodear credenciales. Cargar SIEMPRE desde .env
"""
import os
import secrets
from dotenv import load_dotenv

# Cargar variables del archivo .env
load_dotenv('.env')
load_dotenv('.env.local')


def get_admin_token_validated() -> str:
    """
    Obtiene y VALIDA el token de admin desde .env
    Asegura que sea suficientemente fuerte (mínimo 32 caracteres)
    """
    admin_token = os.getenv('ADMIN_TOKEN')
    
    if not admin_token:
        raise ValueError(
            "❌ CRÍTICO: ADMIN_TOKEN no configurado en .env\n"
            "Genera uno con: python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
            "Luego agrega a .env: ADMIN_TOKEN=<token-generado>"
        )
    
    if admin_token == 'bienes-admin-default-token':
        raise ValueError(
            "❌ CRÍTICO: ADMIN_TOKEN usa valor por defecto inseguro\n"
            "Genera uno NUEVO con: python -c \"import secrets; print(secrets.token_urlsafe(32))\"\n"
            "Actualiza .env inmediatamente"
        )
    
    if len(admin_token) < 32:
        raise ValueError(
            f"❌ CRÍTICO: ADMIN_TOKEN es demasiado débil ({len(admin_token)} caracteres)\n"
            "Debe tener mínimo 32 caracteres para seguridad OWASP\n"
            "Genera uno nuevo con: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
        )
    
    return admin_token


# Token único para autenticación de admin (validado)
try:
    ADMIN_TOKEN = get_admin_token_validated()
except ValueError as e:
    # En desarrollo: permitir continuar pero log
    print(f"⚠️ ADVERTENCIA DE SEGURIDAD: {e}")
    ADMIN_TOKEN = None  # Será validado en cada request


# Rate Limiting Configuration (OWASP)
RATE_LIMIT_MAX_ATTEMPTS = 5          # Máx 5 intentos fallidos
RATE_LIMIT_WINDOW_MINUTES = 15       # En ventana de 15 minutos
RATE_LIMIT_BAN_MINUTES = 60          # Bloquear por 60 minutos después

# Session Configuration
SESSION_TIMEOUT_MINUTES = 15         # Access token: 15 minutos
INACTIVITY_TIMEOUT_MINUTES = 15      # Mismo que access token

# Security Logging
LOG_FAILED_LOGIN_ATTEMPTS = True
LOG_BLOCKED_IPS = True

# Password Policy (OWASP)
MIN_PASSWORD_LENGTH = 12
PASSWORD_REQUIRES_UPPERCASE = True
PASSWORD_REQUIRES_LOWERCASE = True
PASSWORD_REQUIRES_NUMBERS = True
PASSWORD_REQUIRES_SPECIAL = True

# JWT Configuration
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
JWT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
