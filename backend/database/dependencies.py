from typing import Generator
from sqlalchemy.orm import Session
from .enums import DatabaseType
from .manager import DatabaseManager
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import os
import logging

# Configuración JWT
JWT_SECRET = os.getenv("SECRET_KEY")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")

# Esquema de seguridad Bearer
security = HTTPBearer()

def get_db_dependency(db_type: DatabaseType):
    def dependency() -> Generator[Session, None, None]:
        db = DatabaseManager.get_session(db_type)
        try:
            yield db
        finally:
            db.close()

    return dependency


# Dependencies específicas para cada BD (para usar en FastAPI)
get_db_app_comandas = get_db_dependency(DatabaseType.APP_PAS_SISTEMAS)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependencia de FastAPI que valida el token JWT y retorna los datos del usuario
    
    Uso:
        @router.get("/protected")
        async def protected_route(current_user: dict = Depends(get_current_user)):
            # current_user contiene: sub, user_id, roles, permisos
            pass
    
    Raises:
        HTTPException: 401 si el token es inválido o expirado
    """
    if not JWT_SECRET:
        logging.error("SECRET_KEY no configurada")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Configuración del servidor incorrecta"
        )
    
    token = credentials.credentials
    
    try:
        # Decodificar el token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Validar que tenga los campos requeridos
        username = payload.get("sub")
        user_id = payload.get("user_id")
        
        if username is None or user_id is None:
            logging.warning(f"Token sin campos requeridos: {payload}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido - campos requeridos faltantes",
                headers={"WWW-Authenticate": "Bearer"}
            )
        
        return payload
        
    except JWTError as e:
        logging.warning(f"Error al decodificar JWT: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )