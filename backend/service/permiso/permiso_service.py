"""Service para lógica de negocio de Permiso"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List, Optional
import logging

from repository.permiso import permiso_repository
from schemas.schemas import (
    PermisoCreate,
    PermisoUpdate,
    PermisoResponse,
)

logger = logging.getLogger(__name__)


def _dump_model(model):
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _dump_model_exclude_unset(model):
    if hasattr(model, "model_dump"):
        return model.model_dump(exclude_unset=True)
    return model.dict(exclude_unset=True)


def _validate_response(schema, value):
    if hasattr(schema, "model_validate"):
        return schema.model_validate(value)
    return schema.from_orm(value)


def create_permiso(db: Session, permiso_data: PermisoCreate) -> PermisoResponse:
    """Crear un nuevo permiso con validaciones"""
    # Validar que el nombre del permiso no exista
    existing = permiso_repository.get_permiso_by_nombre(db, permiso_data.nombre_permiso)
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"El permiso '{permiso_data.nombre_permiso}' ya existe",
        )

    try:
        permiso = permiso_repository.create_permiso(db, _dump_model(permiso_data))
        logger.info(f"Permiso creado: {permiso.nombre_permiso}")
        return _validate_response(PermisoResponse, permiso)
    except Exception as e:
        logger.error(f"Error al crear permiso: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al crear permiso")


def get_permiso(db: Session, permiso_id: int) -> PermisoResponse:
    """Obtener un permiso por ID"""
    permiso = permiso_repository.get_permiso_by_id(db, permiso_id)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    return _validate_response(PermisoResponse, permiso)


def get_all_permisos(
    db: Session, skip: int = 0, limit: int = 100, modulo: Optional[str] = None
) -> List[PermisoResponse]:
    """Obtener todos los permisos con paginación y filtro opcional por módulo"""
    if modulo:
        permisos = permiso_repository.get_permisos_by_modulo(db, modulo)
    else:
        permisos = permiso_repository.get_all_permisos(db, skip, limit)

    return [_validate_response(PermisoResponse, p) for p in permisos]


def update_permiso(
    db: Session, permiso_id: int, permiso_data: PermisoUpdate
) -> PermisoResponse:
    """Actualizar un permiso existente con validaciones"""
    permiso = permiso_repository.get_permiso_by_id(db, permiso_id)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    # Validar nombre único si se está actualizando
    if permiso_data.nombre_permiso:
        existing = permiso_repository.get_permiso_by_nombre(
            db, permiso_data.nombre_permiso
        )
        if existing and existing.id != permiso_id:
            raise HTTPException(
                status_code=400,
                detail=f"El permiso '{permiso_data.nombre_permiso}' ya existe",
            )

    try:
        update_data = _dump_model_exclude_unset(permiso_data)
        permiso_updated = permiso_repository.update_permiso(db, permiso_id, update_data)
        logger.info(f"Permiso actualizado: {permiso_updated.nombre_permiso}")
        return _validate_response(PermisoResponse, permiso_updated)
    except Exception as e:
        logger.error(f"Error al actualizar permiso: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al actualizar permiso")


def delete_permiso(db: Session, permiso_id: int) -> dict:
    """Eliminar un permiso"""
    permiso = permiso_repository.get_permiso_by_id(db, permiso_id)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    try:
        permiso_repository.delete_permiso(db, permiso_id)
        logger.info(f"Permiso eliminado: {permiso.nombre_permiso}")
        return {"message": "Permiso eliminado exitosamente"}
    except Exception as e:
        logger.error(f"Error al eliminar permiso: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al eliminar permiso")