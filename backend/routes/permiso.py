from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database.dependencies import get_db_app_comandas
from service.permiso.permiso_service import (
    create_permiso,
    get_permiso,
    get_all_permisos,
    update_permiso,
    delete_permiso,
)

from schemas.schemas import (
    PermisoCreate,
    PermisoUpdate,
    PermisoResponse,
)
import logging

logger = logging.getLogger(__name__)
permiso_router = APIRouter()


@permiso_router.post(
    "/", response_model=PermisoResponse, tags=["permisos"], status_code=201
)
def crear_permiso(
    permiso: PermisoCreate,
    db: Session = Depends(get_db_app_comandas),
):
    """Crear un nuevo permiso"""
    logger.info(f"[API] POST /permisos - Crear permiso: {permiso.nombre_permiso}")
    return create_permiso(db, permiso)


@permiso_router.get("/{permiso_id}", response_model=PermisoResponse, tags=["permisos"])
def obtener_permiso(
    permiso_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Obtener un permiso por ID"""
    logger.info(f"[API] GET /permisos/{permiso_id}")
    return get_permiso(db, permiso_id)


@permiso_router.get("/", response_model=List[PermisoResponse], tags=["permisos"])
def listar_permisos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    modulo: Optional[str] = Query(None, description="Filtrar por módulo"),
    db: Session = Depends(get_db_app_comandas),
):
    """Listar todos los permisos con paginación y filtro opcional por módulo"""
    logger.info(f"[API] GET /permisos - skip={skip}, limit={limit}, modulo={modulo}")
    return get_all_permisos(db, skip, limit, modulo)


@permiso_router.put("/{permiso_id}", response_model=PermisoResponse, tags=["permisos"])
def actualizar_permiso(
    permiso_id: int,
    permiso: PermisoUpdate,
    db: Session = Depends(get_db_app_comandas),
):
    """Actualizar un permiso existente"""
    logger.info(f"[API] PUT /permisos/{permiso_id}")
    return update_permiso(db, permiso_id, permiso)


@permiso_router.delete("/{permiso_id}", tags=["permisos"])
def eliminar_permiso(
    permiso_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    """Eliminar un permiso"""
    logger.info(f"[API] DELETE /permisos/{permiso_id}")
    return delete_permiso(db, permiso_id)
