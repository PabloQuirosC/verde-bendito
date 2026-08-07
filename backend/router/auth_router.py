from fastapi import APIRouter, Depends, status, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import logging
import sys
from pathlib import Path
from pydantic import BaseModel

# Agregar backend a path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from database.dependencies import get_db_inmocr
from services import UsuarioService, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES
from schemas.usuario import Token, UsuarioUpdate
from database.security_config import ADMIN_TOKEN
from utils.token_limiter import record_failed_login, reset_login_attempts, is_blocked
from services.auth.email_auth_service import EmailAuthService

# Obtener logger
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Autenticación"])


class AdminLoginRequest(BaseModel):
    """Schema para autenticación de admin (Token + Usuario + Contraseña)"""
    token: str
    usuario: str
    contraseña: str


class EmailTokenRequest(BaseModel):
    """Schema para solicitar token por email"""
    email: str


class EmailTokenVerifyRequest(BaseModel):
    """Schema para verificar token por email"""
    email: str
    token: str





@router.post("/login", response_model=Token)
async def login(
    login_request: AdminLoginRequest,
    db: Session = Depends(get_db_inmocr)
):
    """
    Autenticar admin con Token + Usuario + Contraseña
    """
    try:
        # Verificar si está bloqueado
        is_blocked_now, minutes_remaining = is_blocked()
        if is_blocked_now:
            logger.warning(f"🔒 ACCESO BLOQUEADO TEMPORALMENTE - Minutos restantes: {minutes_remaining}")
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Cuenta bloqueada. Intenta en {minutes_remaining} minutos."
            )
        
        # Paso 1: Validar token
        if login_request.token != ADMIN_TOKEN:
            should_block, remaining = record_failed_login()
            
            if should_block:
                logger.warning(f"❌ BLOQUEO ACTIVADO - Token inválido después de 5 intentos")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiados intentos fallidos. Bloqueado por 30 minutos."
                )
            else:
                logger.warning(f"❌ TOKEN INVÁLIDO - Intentos restantes: {remaining}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token inválido. Intentos restantes: {remaining}/5"
                )
        
        # Paso 2: Validar usuario y contraseña de la BD
        usuario = UsuarioService.authenticate_usuario(
            db,
            login_request.usuario,
            login_request.contraseña
        )
        
        if not usuario:
            should_block, remaining = record_failed_login()
            
            if should_block:
                logger.warning(f"❌ BLOQUEO ACTIVADO - Credenciales inválidas después de 5 intentos")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Demasiados intentos fallidos. Bloqueado por 30 minutos."
                )
            else:
                logger.warning(f"❌ CREDENCIALES INVÁLIDAS - Usuario: {login_request.usuario}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Usuario o contraseña inválidos. Intentos restantes: {remaining}/5"
                )
        
        # Login exitoso - Token + Credenciales validados
        reset_login_attempts()
        logger.info(f"✅ LOGIN EXITOSO - Usuario: {usuario.usuario} ({usuario.nombre_completo})")
        
        # Crear token de acceso JWT
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": usuario.usuario},
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
    except HTTPException as e:
        raise


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Obtener información del usuario actual
    """
    logger.debug(f"👤 CONSULTA DE PERFIL - Usuario: {current_user.get('usuario')}")
    return current_user


@router.post("/logout")
async def logout(current_user: dict = Depends(get_current_user)):
    """
    Cerrar sesión (invalidar token en el cliente)
    """  
    logger.info(f"👋 LOGOUT - Usuario: {current_user.get('usuario', 'desconocido')} | IP: {current_user.get('ip', 'N/A')}")
    return {"message": "Sesión cerrada exitosamente"}


# ============ NUEVOS ENDPOINTS DE AUTENTICACIÓN POR EMAIL ============

@router.post("/request-token")
async def request_token(
    request: EmailTokenRequest,
    db: Session = Depends(get_db_inmocr)
):
    """
    Solicitar token de login por email
    
    El usuario recibe un código de 6 dígitos en su email
    """
    logger.info(f"📧 SOLICITUD DE TOKEN - Email: {request.email}")
    
    exito, mensaje = EmailAuthService.solicitar_token(db, request.email)
    
    if not exito:
        logger.warning(f"❌ FALLO EN SOLICITUD DE TOKEN - Email: {request.email} - {mensaje}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=mensaje
        )
    
    logger.info(f"✅ TOKEN ENVIADO POR EMAIL - {request.email}")
    return {
        "success": True,
        "message": mensaje
    }


@router.post("/verify-token")
async def verify_token(
    request: EmailTokenVerifyRequest,
    db: Session = Depends(get_db_inmocr)
):
    """
    Verificar token de email y generar JWT
    
    El usuario ingresa el código recibido en su email
    """
    logger.info(f"🔐 VERIFICACIÓN DE TOKEN - Email: {request.email}")
    
    exito, mensaje, usuario = EmailAuthService.verificar_token(db, request.email, request.token)
    
    if not exito:
        # Registrar intento fallido
        EmailAuthService.registrar_intento_fallido(db, request.email, request.token)
        logger.warning(f"⚠️ VERIFICACIÓN FALLIDA - Email: {request.email} - Razón: {mensaje}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=mensaje
        )
    
    # Token válido - Crear JWT
    logger.info(f"✅ VERIFICACIÓN EXITOSA - Usuario: {usuario.usuario} | Email: {request.email}")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": usuario.usuario},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": usuario.usuario,
        "nombre": usuario.nombre_completo
    }
