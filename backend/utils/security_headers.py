"""
Configuración Segura para CORS y Security Headers
Implementa estándares OWASP de seguridad web
"""
import os
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi import FastAPI


def configure_security_headers(app: FastAPI) -> FastAPI:
    """
    Configura headers de seguridad en TODAS las respuestas
    Implementa las recomendaciones de OWASP
    """
    
    @app.middleware("http")
    async def add_security_headers(request, call_next):
        response = await call_next(request)
        
        # Prevenir clickjacking
        response.headers["X-Frame-Options"] = "DENY"
        
        # Prevenir MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # Habilitar XSS protection en navegadores antiguos
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Content Security Policy (muy restrictiva)
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "  # Necesario para frameworks como Tailwind
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'"
        )
        
        # HSTS: Forzar HTTPS por 1 año
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        # Referrer policy: no enviar referer a otros sitios
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions policy: restringir características del navegador
        response.headers["Permissions-Policy"] = (
            "geolocation=(), "
            "microphone=(), "
            "camera=(), "
            "payment=()"
        )
        
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        
        return response
    
    return app


def configure_cors_secure(app: FastAPI, allowed_origins: List[str] = None) -> FastAPI:
    """
    Configura CORS de forma segura
    NUNCA usar allow_origins=["*"]
    
    Args:
        app: Aplicación FastAPI
        allowed_origins: Lista de orígenes permitidos desde .env
    """
    
    if allowed_origins is None:
        # Obtener desde variable de entorno
        allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
        allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
    
    if not allowed_origins:
        # DEFAULT: Solo localhost para desarrollo
        allowed_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    
    # Validar que no haya wildcards
    if "*" in allowed_origins:
        raise ValueError("CORS: No se permite allow_origins=['*']. Especifica dominios exactos.")
    
    # Configurar CORS restrictivamente
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Access-Token",
            "X-Requested-With",
            "Accept",
            "Origin"
        ],
        expose_headers=["Content-Length", "X-Total-Count", "X-Page-Count"],
        max_age=600,  # Cache CORS preflight por 10 minutos
    )
    
    return app


def configure_trusted_hosts(app: FastAPI, allowed_hosts: List[str] = None) -> FastAPI:
    """
    Configura validación de Host header
    Previene ataques de Host Header Injection
    """
    
    if allowed_hosts is None:
        allowed_hosts = [
            "localhost",
            "127.0.0.1",
            "inmocr.com",
            "www.inmocr.com",
            os.getenv("API_HOST", "localhost"),
        ]
    
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=allowed_hosts
    )
    
    return app


def validate_security_configuration() -> None:
    """
    Valida que la configuración de seguridad sea correcta
    Ejecutar en startup
    """
    
    # Validar DEBUG mode
    debug = os.getenv("DEBUG", "False").lower() == "true"
    if debug:
        raise ValueError("❌ DEBUG=True en producción es un riesgo crítico. Cambiar a DEBUG=False")
    
    # Validar ALLOWED_ORIGINS
    allowed_origins = os.getenv("ALLOWED_ORIGINS", "")
    if "*" in allowed_origins:
        raise ValueError("❌ CORS: No se permite allow_origins=['*']. Especifica dominios exactos")
    
    # Validar SECRET_KEY
    from database.security_config import get_admin_token_validated
    try:
        get_admin_token_validated()
    except ValueError as e:
        raise ValueError(f"❌ Configuración de token insegura: {e}")
    
    print("✅ Configuración de seguridad validada correctamente")
