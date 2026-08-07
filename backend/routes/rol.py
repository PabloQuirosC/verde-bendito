from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database.dependencies import get_db_app_comandas
from service.rol.rol_service import (
    create_rol,
    get_rol,
    get_all_roles,
    update_rol,
    delete_rol,
    asignar_permiso,
    remover_permiso,
)

from schemas.schemas import (
    RolCreate,
    RolUpdate,
    RolResponse,
    RolWithPermisos,
    AsignarPermisoRequest,
)
import logging

logger = logging.getLogger(__name__)
rol_router = APIRouter()


@rol_router.post("/", response_model=RolResponse, tags=["roles"], status_code=201)
def crear_rol(
    rol: RolCreate,
    db: Session = Depends(get_db_app_comandas),
):
    """Crear un nuevo rol"""
    logger.info(f"[API] POST /roles - Crear rol: {rol.nombre_rol}")
    return create_rol(db, rol)


@rol_router.get("/{rol_id}", response_model=RolWithPermisos, tags=["roles"])
def obtener_rol(
    rol_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Obtener un rol por ID con sus permisos"""
    logger.info(f"[API] GET /roles/{rol_id}")
    return get_rol(db, rol_id)


@rol_router.get("/", response_model=List[RolResponse], tags=["roles"])
def listar_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas),
):
    """Listar todos los roles con paginación"""
    logger.info(f"[API] GET /roles - skip={skip}, limit={limit}")
    return get_all_roles(db, skip, limit)


@rol_router.put("/{rol_id}", response_model=RolResponse, tags=["roles"])
def actualizar_rol(
    rol_id: int,
    rol: RolUpdate,
    db: Session = Depends(get_db_app_comandas),
):
    """Actualizar un rol existente"""
    logger.info(f"[API] PUT /roles/{rol_id}")
    return update_rol(db, rol_id, rol)


@rol_router.delete("/{rol_id}", tags=["roles"])
def eliminar_rol(
    rol_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Eliminar un rol"""
    logger.info(f"[API] DELETE /roles/{rol_id}")
    return delete_rol(db, rol_id)


@rol_router.post("/{rol_id}/permisos", tags=["roles"])
def asignar_permiso_a_rol(
    rol_id: int,
    request: AsignarPermisoRequest,
    db: Session = Depends(get_db_app_comandas),
):
    """Asignar un permiso a un rol"""
    if request.rol_id != rol_id:
        raise HTTPException(status_code=400, detail="ID de rol no coincide")

    logger.info(
        f"[API] POST /roles/{rol_id}/permisos - Asignar permiso {request.permiso_id}"
    )
    return asignar_permiso(db, rol_id, request.permiso_id)


@rol_router.delete("/{rol_id}/permisos/{permiso_id}", tags=["roles"])
def remover_permiso_de_rol(
    rol_id: int,
    permiso_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Remover un permiso de un rol"""
    logger.info(f"[API] DELETE /roles/{rol_id}/permisos/{permiso_id}")
    return remover_permiso(db, rol_id, permiso_id)
