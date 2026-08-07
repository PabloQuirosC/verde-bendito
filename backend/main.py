from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from database.manager import DatabaseManager
from database.enums import DatabaseType
from utils.auditoria_utils import log_auditoria
from jose import jwt
import traceback
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Importaciones sin puntos (porque se ejecuta como módulo principal)
from database.bases import Base
from database.manager import DatabaseManager
from database.enums import DatabaseType
from routes.router import main_router

app = FastAPI(
    title="ComandasPRO API",
    description="API para gestión de comandas de restaurante",
    version="1.0.0"
)


class AuditoriaMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Información mínima para auditoría: método, path, ip, user-agent
        client_host = request.client.host if request.client else None
        user_agent = request.headers.get('user-agent')
        method = request.method
        path = request.url.path
        # Solo loggear rutas de API para reducir ruido (rutas públicas como /docs, /health, etc. se omiten)
        is_api = path.startswith("/api/")

        try:
            # intentar extraer usuario desde Authorization Bearer token
            auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
            usuario_id = None
            nombre_usuario = None
            if auth_header and auth_header.lower().startswith('bearer '):
                token = auth_header.split(' ', 1)[1].strip()
                try:
                    payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=[os.getenv('ALGORITHM', 'HS256')])
                    usuario_id = payload.get('user_id')
                    nombre_usuario = payload.get('sub') or payload.get('username')
                except Exception:
                    usuario_id = None
                    nombre_usuario = None

            response = await call_next(request)
            status = response.status_code
        except Exception as e:
            status = 500
            if is_api and (usuario_id or nombre_usuario):
                try:
                    db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
                    try:
                        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=nombre_usuario, accion="REQUEST_ERROR", modulo="middleware", tabla_afectada=None, registro_id=None, datos_antes=None, datos_despues={"status": 500, "error_type": type(e).__name__}, ip_usuario=client_host, navegador=user_agent, dispositivo=None)
                    finally:
                        db.close()
                except Exception:
                    pass
            raise

        # Log success — solo rutas API con usuario autenticado
        if is_api and (usuario_id or nombre_usuario):
            try:
                db = DatabaseManager.get_session(DatabaseType.APP_PAS_SISTEMAS)
                try:
                    log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=nombre_usuario, accion="REQUEST", modulo="middleware", tabla_afectada=None, registro_id=None, datos_antes=None, datos_despues={"status": status}, ip_usuario=client_host, navegador=user_agent, dispositivo=None)
                finally:
                    db.close()
            except Exception:
                pass

        return response

# Configuración CORS más simple y robusta
app.add_middleware(
    CORSMiddleware,
    # Orígenes permitidos (no usar '*' cuando allow_credentials=True)
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://192.168.100.64:5173",
        "http://192.168.100.64:8080",
        "http://192.168.100.64:8081",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Registrar middleware de auditoría al final de la pila
app.add_middleware(AuditoriaMiddleware)


@app.get("/")
def root():
    """API root endpoint."""
    return {
        "message": "ComandasPRO API v1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}


# Incluir rutas principales
app.include_router(main_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", "8000"))
    reload = os.getenv("API_RELOAD", "True").lower() == "true"
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=reload,
    )

