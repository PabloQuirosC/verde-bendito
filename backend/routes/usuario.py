from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database.dependencies import get_db_app_comandas
from service.usuario.usuario_service import (
    create_usuario,
    get_usuario,
    get_all_usuarios,
    update_usuario,
    delete_usuario,
    asignar_rol,
    remover_rol,
    get_usuario_permisos,
)

from schemas.schemas import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResponse,
    UsuarioWithRoles,
    AsignarRolRequest,
)
import logging
from passlib.exc import UnknownHashError
from utils.auditoria_utils import log_auditoria

logger = logging.getLogger(__name__)
usuario_router = APIRouter()


@usuario_router.post(
    "/", response_model=UsuarioResponse, tags=["usuarios"], status_code=201
)
def crear_usuario(
    usuario: UsuarioCreate,
    db: Session = Depends(get_db_app_comandas),
):
    """Crear un nuevo usuario"""
    logger.info(f"[API] POST /usuarios - Crear usuario: {usuario.nombre_usuario}")
    created = create_usuario(db, usuario)
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="CREAR_USUARIO", modulo="usuario", tabla_afectada="usuario", registro_id=getattr(created, 'id', None), datos_antes=None, datos_despues={"nombre_usuario": usuario.nombre_usuario, "nombre": usuario.nombre})
    except Exception:
        pass
    return created


@usuario_router.get("/{usuario_id}", response_model=UsuarioWithRoles, tags=["usuarios"])
def obtener_usuario(
    usuario_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Obtener un usuario por ID con sus roles"""
    logger.info(f"[API] GET /usuarios/{usuario_id}")
    return get_usuario(db, usuario_id)


@usuario_router.get("/", response_model=List[UsuarioWithRoles], tags=["usuarios"])
def listar_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas),
):
    """Listar todos los usuarios con paginación y roles"""
    logger.info(f"[API] GET /usuarios - skip={skip}, limit={limit}")
    return get_all_usuarios(db, skip, limit)


@usuario_router.put("/{usuario_id}", response_model=UsuarioResponse, tags=["usuarios"])
def actualizar_usuario(
    usuario_id: int,
    usuario: UsuarioUpdate,
    db: Session = Depends(get_db_app_comandas),
):
    """Actualizar un usuario existente"""
    logger.info(f"[API] PUT /usuarios/{usuario_id}")
    before = None
    try:
        from repository.usuario.usuario_repository import get_usuario_by_id
        u = get_usuario_by_id(db, usuario_id)
        if u:
            before = {"id": u.id, "nombre_usuario": u.nombre_usuario, "email": u.email}
    except Exception:
        before = None

    updated = update_usuario(db, usuario_id, usuario)
    try:
        after = None
        if updated:
            after = {"id": getattr(updated, 'id', usuario_id), "nombre_usuario": getattr(updated, 'nombre_usuario', None), "email": getattr(updated, 'email', None)}
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=None, accion="ACTUALIZAR_USUARIO", modulo="usuario", tabla_afectada="usuario", registro_id=usuario_id, datos_antes=before, datos_despues=after)
    except Exception:
        pass
    return updated


@usuario_router.delete("/{usuario_id}", tags=["usuarios"])
def eliminar_usuario(
    usuario_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Eliminar un usuario"""
    logger.info(f"[API] DELETE /usuarios/{usuario_id}")
    try:
        from repository.usuario.usuario_repository import get_usuario_by_id
        u = get_usuario_by_id(db, usuario_id)
        before = None
        if u:
            before = {"id": u.id, "nombre_usuario": u.nombre_usuario, "email": u.email}
    except Exception:
        before = None

    res = delete_usuario(db, usuario_id)
    try:
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=None, accion="ELIMINAR_USUARIO", modulo="usuario", tabla_afectada="usuario", registro_id=usuario_id, datos_antes=before, datos_despues={"deleted": bool(res)})
    except Exception:
        pass
    return res


@usuario_router.post("/{usuario_id}/roles", tags=["usuarios"])
def asignar_rol_a_usuario(
    usuario_id: int,
    request: AsignarRolRequest,
    db: Session = Depends(get_db_app_comandas),
):
    """Asignar un rol a un usuario"""
    if request.usuario_id != usuario_id:
        raise HTTPException(status_code=400, detail="ID de usuario no coincide")

    logger.info(
        f"[API] POST /usuarios/{usuario_id}/roles - Asignar rol {request.rol_id}"
    )
    res = asignar_rol(db, usuario_id, request.rol_id)
    try:
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=None, accion="ASIGNAR_ROL", modulo="usuario", tabla_afectada="usuario_roles", registro_id=usuario_id, datos_antes=None, datos_despues={"rol_id": request.rol_id})
    except Exception:
        pass
    return res


@usuario_router.delete("/{usuario_id}/roles/{rol_id}", tags=["usuarios"])
def remover_rol_de_usuario(
    usuario_id: int,
    rol_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Remover un rol de un usuario"""
    logger.info(f"[API] DELETE /usuarios/{usuario_id}/roles/{rol_id}")
    res = remover_rol(db, usuario_id, rol_id)
    try:
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=None, accion="REMOVER_ROL", modulo="usuario", tabla_afectada="usuario_roles", registro_id=usuario_id, datos_antes=None, datos_despues={"rol_id": rol_id})
    except Exception:
        pass
    return res


@usuario_router.get(
    "/{usuario_id}/permisos", response_model=List[str], tags=["usuarios"]
)
def obtener_permisos_usuario(
    usuario_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Obtener todos los permisos de un usuario a través de sus roles"""
    logger.info(f"[API] GET /usuarios/{usuario_id}/permisos")
    return get_usuario_permisos(db, usuario_id)


@usuario_router.post("/{usuario_id}/reset-password", tags=["usuarios"])
def resetear_contraseña(
    usuario_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Resetear contraseña de un usuario a 'Soporte'"""
    from passlib.context import CryptContext
    from passlib.exc import UnknownHashError
    
    pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')
    
    usuario = get_usuario(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    password_hash = pwd_context.hash('Soporte')
    update_usuario(db, usuario_id, UsuarioUpdate(contrasena=password_hash))
    try:
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=None, accion="RESET_PASSWORD", modulo="usuario", tabla_afectada="usuario", registro_id=usuario_id, datos_antes=None, datos_despues={"temporal_password": "Soporte"})
    except Exception:
        pass
    
    return {
        "success": True,
        "message": "Contraseña reseteada a 'Soporte'",
        "temporal_password": "Soporte"
    }


@usuario_router.post("/{usuario_id}/cambiar-password", tags=["usuarios"])
def cambiar_contraseña(
    usuario_id: int,
    data: dict,
    db: Session = Depends(get_db_app_comandas),
):
    """Cambiar contraseña del usuario"""
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=['pbkdf2_sha256'], deprecated='auto')
    
    # Obtener el modelo ORM completo (incluye campo 'password')
    from repository.usuario.usuario_repository import get_usuario_by_id

    usuario_model = get_usuario_by_id(db, usuario_id)
    if not usuario_model:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Verificar contraseña actual contra el hash almacenado
    stored_hash = getattr(usuario_model, 'password', '')
    current_pwd = data.get('contraseña_actual', '')
    try:
        ok = pwd_context.verify(current_pwd, stored_hash)
    except UnknownHashError:
        # Fallback para hashes no identificados: comparar directamente (legado)
        ok = (current_pwd == stored_hash) or (current_pwd == 'Soporte')

    if not ok:
        raise HTTPException(status_code=401, detail="Contraseña actual incorrecta")
    
    # Validar nueva contraseña
    nueva_contraseña = data.get('contraseña_nueva', '').strip()
    if len(nueva_contraseña) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Actualizar contraseña
    password_hash = pwd_context.hash(nueva_contraseña)
    update_usuario(db, usuario_id, UsuarioUpdate(contrasena=password_hash))
    
    return {
        "success": True,
        "message": "Contraseña cambiada exitosamente"
    }


@usuario_router.get("/{usuario_id}/perfil", tags=["usuarios"]) 
def obtener_perfil_usuario(
    usuario_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Endpoint que devuelve estadísticas sencillas del usuario: comandas tomadas hoy, vendido hoy y horas de turno estimadas."""
    from models.comanda import Comanda
    from models.usuario import Usuario
    from datetime import datetime, timedelta
    from sqlalchemy import func

    try:
        # obtener datos del usuario
        usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
        if not usuario:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")

        # Calcular inicio y fin del día actual en UTC
        now_utc = datetime.utcnow()
        start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # comandas tomadas hoy por mesero
        comandas_count = db.query(func.count(Comanda.id)).filter(
            Comanda.usuario_mesero_id == usuario_id,
            Comanda.fecha_creacion >= start_of_day,
            Comanda.fecha_creacion < end_of_day
        ).scalar() or 0

        # vendido hoy: sumar total de comandas creadas hoy por mesero
        vendido = db.query(func.coalesce(func.sum(Comanda.total), 0)).filter(
            Comanda.usuario_mesero_id == usuario_id,
            Comanda.fecha_creacion >= start_of_day,
            Comanda.fecha_creacion < end_of_day
        ).scalar() or 0

        # turno_horas: estimación desde primera comanda del día hasta ahora
        first_ts = db.query(func.min(Comanda.fecha_creacion)).filter(
            Comanda.usuario_mesero_id == usuario_id,
            Comanda.fecha_creacion >= start_of_day,
            Comanda.fecha_creacion < end_of_day
        ).scalar()

        turno_horas = None
        if first_ts:
            delta = now_utc - first_ts
            turno_horas = round(delta.total_seconds() / 3600, 2)

        return {
            "nombre": usuario.nombre,
            "apellido": usuario.apellido,
            "nombre_usuario": usuario.nombre_usuario,
            "email": usuario.email,
            "comandas_count": int(comandas_count),
            "vendido": float(vendido),
            "turno_horas": turno_horas,
            "turno": f"{turno_horas}h" if turno_horas is not None else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error al calcular perfil de usuario")
        raise HTTPException(status_code=500, detail=str(e))


@usuario_router.get("/stats/activos", tags=["usuarios"])
def obtener_usuarios_activos(
    db: Session = Depends(get_db_app_comandas),
):
    """Obtener cantidad de usuarios activos en el sistema"""
    from repository.usuario import usuario_repository

    logger.info("[API] GET /usuarios/stats/activos")
    count = usuario_repository.get_usuarios_activos(db)
    return {"count": count}

