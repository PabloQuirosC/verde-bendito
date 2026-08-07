from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas, get_current_user
from service.auth.auth_service import authenticate_user, logout_user, get_user_realdata
from schemas.schemas import Credenciales, RespuestaExitosa
from utils.utils import get_client_ip
import logging
from pydantic import BaseModel
from utils.auditoria_utils import log_auditoria
from fastapi import HTTPException

auth_router = APIRouter()


class LogoutRequest(BaseModel):
    usuario_id: int
    usuario: str


@auth_router.post(
    "/validar-usuario", response_model=RespuestaExitosa, tags=["autenticación"]
)
async def validar_usuario(
    cred: Credenciales,
    request: Request,
    db: Session = Depends(get_db_app_comandas),
):
    try:
        # Obtener IP del cliente
        client_ip = get_client_ip(request)

        # Si no se proporciona country, intentar obtenerlo de la BD del usuario
        country = cred.country
        if not country:
            from repository.usuario.usuario_repository import get_usuario_by_username
            user_data = get_usuario_by_username(db, cred.usuario)
            if user_data and len(user_data) > 3:  # Si el usuario existe y tiene país
                country = user_data[3] if user_data[3] else "CR"  # Usar CR como default
            else:
                country = "CR"  # Default si no existe el usuario o no tiene país

        logging.info(
            f"[API] POST /auth/validar-usuario - Usuario: {cred.usuario}, País: {country}, IP: {client_ip}"
        )

        try:
            result = authenticate_user(
                db, cred.usuario, cred.contrasena, client_ip, country
            )
            # Registrar auditoría de login exitoso
            try:
                log_auditoria(db=db, usuario_id=result.get('user_id') if isinstance(result, dict) else None, nombre_usuario=cred.usuario, accion="LOGIN_SUCCESS", modulo="auth", tabla_afectada="usuario", registro_id=result.get('user_id') if isinstance(result, dict) else None, datos_antes=None, datos_despues={"usuario": cred.usuario})
            except Exception:
                pass

            return result
        except HTTPException as he:
            # Registrar intento fallido de login
            try:
                log_auditoria(db=db, usuario_id=None, nombre_usuario=cred.usuario, accion="LOGIN_FAILED", modulo="auth", tabla_afectada="usuario", registro_id=None, datos_antes=None, datos_despues={"usuario": cred.usuario, "reason": str(he.detail)})
            except Exception:
                pass
            raise
    except Exception as e:
        logging.error(f"Error en validar_usuario: {str(e)}", exc_info=True)
        raise


@auth_router.post("/logout", tags=["autenticación"])
async def logout(
    logout_req: LogoutRequest,
    request: Request,
    db: Session = Depends(get_db_app_comandas),
):
    """Cerrar sesión del usuario"""
    client_ip = get_client_ip(request)
    
    logging.info(
        f"[API] POST /auth/logout - Usuario: {logout_req.usuario} (ID: {logout_req.usuario_id}), IP: {client_ip}"
    )
    
    result = logout_user(db, logout_req.usuario_id, logout_req.usuario, client_ip)
    # Registrar auditoría de logout
    try:
        log_auditoria(db=db, usuario_id=logout_req.usuario_id, nombre_usuario=logout_req.usuario, accion="LOGOUT", modulo="auth", tabla_afectada="usuario", registro_id=logout_req.usuario_id, datos_antes=None, datos_despues={"usuario": logout_req.usuario})
    except Exception:
        pass

    return result


@auth_router.get("/me", tags=["autenticación"])
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db_app_comandas),
):
    """
    Obtener datos reales del usuario autenticado desde la base de datos
    
    Este endpoint valida que los permisos en el token coincidan con los de la BD,
    previniendo manipulación de sessionStorage/localStorage
    
    Returns:
        Dict con user_id, usuario, roles y permisos reales
    """
    user_id = current_user.get("user_id")
    username = current_user.get("sub")
    
    logging.info(
        f"[API] GET /auth/me - Usuario: {username} (ID: {user_id})"
    )
    
    # Obtener datos reales desde la BD
    result = get_user_realdata(db, user_id, username)
    
    return result
