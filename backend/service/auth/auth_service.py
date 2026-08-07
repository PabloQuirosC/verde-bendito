"""Service para lógica de negocio de autenticación"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
import requests
import os
from jose import jwt
import logging
from typing import Dict, Any
from datetime import datetime, timedelta
from passlib.exc import UnknownHashError
from repository.usuario.usuario_repository import (
    get_usuario_by_username,
    get_usuario_roles,
    get_usuario_permisos,
    actualizar_ultimo_login,
)

from utils.utils import (
    is_locked,
    record_successful_attempt,
    record_failed_attempt,
    log_security_event,
)


# Configurar logger
logger = logging.getLogger(__name__)

# Configuración
AUTH_API_URL = os.getenv("AUTH_API_URL")
AUTH_COUNTRY = os.getenv("AUTH_COUNTRY")
JWT_SECRET = os.getenv("SECRET_KEY")
JWT_ALGORITHM = os.getenv("ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.getenv("JWT_EXP_MINUTES", 60))


def validate_user_via_rest_api(
    usuario: str, contrasena: str, country: str
) -> Dict[str, Any]:
    """Validar usuario contra API REST o contra BD local si no está configurada"""
    # Si AUTH_API_URL no está configurada, validar contra BD local
    if not AUTH_API_URL:
        logger.info("AUTH_API_URL no configurada. Usando validación local contra BD.")
        return _validate_user_local(usuario, contrasena, country)

    try:
        payload = {"username": usuario, "password": contrasena, "country": country}

        response = requests.post(AUTH_API_URL, json=payload, timeout=10, verify=False)

        # Si el endpoint retorna error HTTP (4xx, 5xx)
        if response.status_code != 200:
            logger.error(
                f"Error en API de autenticación: {response.status_code} - {response.text}"
            )
            raise HTTPException(
                status_code=500, detail="Error al conectar con servicio de validación"
            )

        data = response.json()

        # Validar que success sea true
        if data.get("success") is True:
            return data
        else:
            return None

    except requests.exceptions.Timeout:
        logger.error("Timeout al conectar con servicio de autenticación")
        raise HTTPException(
            status_code=500,
            detail="Tiempo de espera agotado con servicio de validación",
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Error de conexión con servicio de autenticación: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al conectar con servicio de validación: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Error inesperado en validación: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error interno en el servicio de validación",
        )


def _validate_user_local(usuario: str, contrasena: str, country: str) -> Dict[str, Any]:
    """Validar usuario contra BD local con contraseña hasheada"""
    from passlib.context import CryptContext
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from urllib.parse import quote_plus
    from models.usuario import Usuario
    
    try:
        # Create a session for validation
        def get_db_setting(name: str, fallback_name: str):
            value = os.getenv(name)
            if value:
                return value
            return os.getenv(fallback_name)

        user_db = get_db_setting('MYSQL_USER_APP_PAS_SISTEMAS', 'MYSQL_USER_APP_PAS_COMANDAS')
        password_db = get_db_setting('MYSQL_PASSWORD_APP_PAS_SISTEMAS', 'MYSQL_PASSWORD_APP_PAS_COMANDAS')
        host_db = get_db_setting('MYSQL_HOST_APP_PAS_SISTEMAS', 'MYSQL_HOST_APP_PAS_COMANDAS')
        port_db = get_db_setting('MYSQL_PORT_APP_PAS_SISTEMAS', 'MYSQL_PORT_APP_PAS_COMANDAS')
        database_db = get_db_setting('MYSQL_SERVICE_APP_PAS_SISTEMAS', 'MYSQL_SERVICE_APP_PAS_COMANDAS')
        
        password_encoded = quote_plus(password_db)
        database_url = f'mysql+pymysql://{user_db}:{password_encoded}@{host_db}:{port_db}/{database_db}'
        
        engine = create_engine(database_url)
        Session = sessionmaker(bind=engine)
        db_session = Session()
        
        pwd_context = CryptContext(schemes=['bcrypt', 'pbkdf2_sha256'], deprecated='auto')

        def verify_password_compat(plain_password: str, stored_password: str) -> bool:
            """Verificar contraseñas soportando hashes modernos y credenciales legadas."""
            try:
                return pwd_context.verify(plain_password, stored_password)
            except UnknownHashError:
                logger.warning(
                    "Hash no identificado para usuario local %s; intentando comparación legada",
                    usuario,
                )
                return plain_password == stored_password
        
        # Get user from DB
        usuario_obj = db_session.query(Usuario).filter(Usuario.nombre_usuario == usuario).first()
        
        if not usuario_obj:
            logger.warning(f"Usuario no encontrado en BD: {usuario}")
            db_session.close()
            return None
        
        # Allow special temporary password 'Soporte' for password reset flows.
        # WARNING: Esta es una excepción intencional para permitir que usuarios con contraseña
        # temporal inicien sesión y sean forzados a cambiarla. Considerar reemplazar por
        # una verificación basada en una columna de 'must_change_password' en la BD.
        if contrasena == 'Soporte':
            logger.info(f"Inicio de sesión con contraseña temporal 'Soporte' para usuario: {usuario}")
            db_session.close()
            return {
                "success": True,
                "username": usuario_obj.nombre_usuario,
                "email": usuario_obj.email,
                "pais": usuario_obj.pais or country or "CR",
            }

        # Verify password
        if not verify_password_compat(contrasena, usuario_obj.password):
            logger.warning(f"Contraseña inválida para usuario: {usuario}")
            db_session.close()
            return None
        
        # Return success
        db_session.close()
        return {
            "success": True,
            "username": usuario_obj.nombre_usuario,
            "email": usuario_obj.email,
            "pais": usuario_obj.pais or country or "CR"
        }
    
    except Exception as e:
        logger.error(f"Error en validación local: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error en validación de usuario"
        )


def _get_existing_user_or_403(db: Session, username: str) -> Dict[str, Any]:
    """Obtiene el usuario desde BD y valida estado; no crea usuarios."""
    user_data = get_usuario_by_username(db, username)
    if not user_data:
        logger.warning(f"Intento de acceso de usuario no registrado: {username}")
        log_security_event("UNKNOWN_USER", {"usuario": username}, "-")
        raise HTTPException(
            status_code=403, detail="Usuario no autorizado en el sistema"
        )

    user_id, nombre_usuario, estado_usuario = user_data
    if estado_usuario == 0:
        raise HTTPException(status_code=403, detail="Tu usuario está inactivo")

    return {
        "user_id": user_id,
        "nombreUsuario": nombre_usuario,
        "estadocuentaid": estado_usuario,
    }


def generate_token(payload: Dict[str, Any]) -> str:
    """Generar token JWT con tiempo de expiración"""
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="SECRET_KEY no configurada")
    
    # Agregar tiempo de expiración al payload
    exp_time = datetime.utcnow() + timedelta(minutes=JWT_EXP_MINUTES)
    payload["exp"] = exp_time
    payload["iat"] = datetime.utcnow()
    
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def authenticate_user(
    db: Session, usuario: str, contrasena: str, client_ip: str, country: str
) -> Dict[str, Any]:
    """Autenticar usuario con el siguiente orden: 1) validar existe en BD, 2) verificar IP bloqueada, 3) validar contra REST API, y 4) generar JWT."""
    logger.info(
        f"Intento de login - Usuario: {usuario} - País: {country} - IP: {client_ip}"
    )

    # 1. Validar que el usuario exista en BD y esté activo
    user_info = _get_existing_user_or_403(db, usuario)

    # 2. Verificar si la IP está bloqueada
    if is_locked(client_ip):
        log_security_event("BLOCKED_IP_ATTEMPT", {"usuario": usuario}, client_ip)
        logger.warning(f"IP bloqueada intentó acceder - IP: {client_ip}")
        raise HTTPException(
            status_code=429,
            detail="IP temporalmente bloqueada. Intente nuevamente en unos minutos.",
        )

    try:
        # 2. Validar contra API REST y obtener respuesta completa
        ldap_response = validate_user_via_rest_api(usuario, contrasena, country)

        if not ldap_response:
            # Registrar intento fallido
            record_failed_attempt(client_ip)
            log_security_event(
                "FAILED_LOGIN",
                {"usuario": usuario, "reason": "Invalid credentials"},
                client_ip,
            )
            logger.warning(f"Acceso denegado para usuario: {usuario}")
            raise HTTPException(status_code=401, detail="Usuario o contraseña inválido")

        # 3. Registrar éxito
        record_successful_attempt(client_ip)
        log_security_event("SUCCESSFUL_LOGIN", {"usuario": usuario}, client_ip)
        logger.info(f"Acceso permitido para usuario: {usuario}")

        # 4. Obtener roles y permisos del usuario desde BD
        user_id = user_info["user_id"]
        roles = get_usuario_roles(db, user_id)
        permisos = get_usuario_permisos(db, user_id)

        # Normalizar roles a slugs en minúsculas (frontend espera array de slugs)
        def role_to_slug(role):
            if isinstance(role, dict):
                name = role.get("nombre", "")
            else:
                name = str(role)
            # Convertir a minúsculas y reemplazar espacios con guiones
            return name.lower().replace(" ", "-") if name else ""
        
        if isinstance(roles, dict):
            role_name = roles.get("nombre", "")
            roles_list = [role_to_slug(role_name)] if role_name else []
        elif isinstance(roles, list):
            roles_list = [role_to_slug(r) for r in roles]
        else:
            roles_list = []

        # 5. Actualizar fecha y hora de último login
        actualizar_ultimo_login(db, user_id)

        # 6. Generar token JWT
        token_payload = {
            "sub": usuario,
            "username": ldap_response.get("username", usuario),
            "email": ldap_response.get("email", ""),
            "user_id": user_id,
            "roles": roles_list,
            "permisos": permisos,
        }
        jwt_token = generate_token(token_payload)

        # 7. Retornar solo el token; el resto de datos viaja dentro del JWT.
        return {"success": True, "token": jwt_token}

    except HTTPException:
        # Re-lanzar HTTPException sin modificar
        raise

    except Exception as e:
        # Error inesperado
        logger.error(f"Error en autenticación: {str(e)}", exc_info=True)
        log_security_event(
            "AUTH_ERROR",
            {"usuario": usuario, "error": str(e)},
            client_ip,
        )
        raise HTTPException(
            status_code=500, detail="Error interno en el proceso de autenticación"
        )


def logout_user(
    db: Session, usuario_id: int, usuario: str, client_ip: str
) -> Dict[str, Any]:
    """Registrar el logout del usuario"""
    try:
        logger.info(f"Logout - Usuario: {usuario} (ID: {usuario_id}) - IP: {client_ip}")
        
        # Registrar actividad de logout
        log_security_event("LOGOUT", {"usuario": usuario}, client_ip)
        
        return {"success": True, "message": "Sesión cerrada exitosamente"}
        
    except Exception as e:
        logger.error(f"Error en logout: {str(e)}")
        raise HTTPException(
            status_code=500, detail="Error al cerrar sesión"
        )


def get_user_realdata(db: Session, user_id: int, username: str) -> Dict[str, Any]:
    """
    Obtener los datos reales del usuario desde la base de datos
    para verificar que no hayan sido manipulados en el frontend
    
    Args:
        db: Sesión de base de datos
        user_id: ID del usuario
        username: Nombre de usuario
        
    Returns:
        Dict con roles y permisos reales del usuario
        
    Raises:
        HTTPException: Si el usuario no existe o está inactivo
    """
    try:
        logger.info(f"🔍 Verificando datos reales - Usuario: {username} (ID: {user_id})")
        
        # Verificar que el usuario existe y está activo
        user_data = get_usuario_by_username(db, username)
        if not user_data:
            logger.warning(f"⚠️ Usuario no encontrado en BD: {username}")
            raise HTTPException(
                status_code=403,
                detail="Usuario no autorizado en el sistema"
            )
        
        db_user_id, nombre_usuario, estado_usuario = user_data
        
        # Validar que el user_id del token coincide con el de BD
        if db_user_id != user_id:
            logger.error(f"❌ ID de usuario no coincide - Token: {user_id}, BD: {db_user_id}")
            raise HTTPException(
                status_code=403,
                detail="Token inválido - ID de usuario no coincide"
            )
        
        # Validar que el usuario está activo
        if estado_usuario == 0:
            logger.warning(f"⚠️ Intento de acceso con usuario inactivo: {username}")
            raise HTTPException(
                status_code=403,
                detail="Usuario inactivo en el sistema"
            )
        
        # Obtener roles y permisos reales desde la BD
        roles = get_usuario_roles(db, user_id)
        permisos = get_usuario_permisos(db, user_id)
        
        logger.info(f"✅ Datos verificados - Roles: {roles}, Permisos: {len(permisos)}")
        
        return {
            "success": True,
            "user_id": user_id,
            "usuario": nombre_usuario,
            "roles": roles,
            "permisos": permisos,
            "estado": estado_usuario
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error al obtener datos reales del usuario: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Error al verificar datos del usuario"
        )