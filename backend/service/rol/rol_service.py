"""Service para lógica de negocio de Rol"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List
import logging

from repository.rol import rol_repository
from repository.permiso import permiso_repository
from schemas.schemas import (
    RolCreate,
    RolUpdate,
    RolResponse,
    RolWithPermisos,
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


def create_rol(db: Session, rol_data: RolCreate) -> RolResponse:
    """Crear un nuevo rol con validaciones"""
    # Validar que el nombre del rol no exista
    existing = rol_repository.get_rol_by_nombre(db, rol_data.nombre_rol)
    if existing:
        raise HTTPException(
            status_code=400, detail=f"El rol '{rol_data.nombre_rol}' ya existe"
        )

    try:
        rol = rol_repository.create_rol(db, _dump_model(rol_data))
        logger.info(f"Rol creado: {rol.nombre_rol}")
        return _validate_response(RolResponse, rol)
    except Exception as e:
        logger.error(f"Error al crear rol: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al crear rol")


def get_rol(db: Session, rol_id: int) -> RolWithPermisos:
    """Obtener un rol por ID con sus permisos"""
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Obtener permisos del rol
    permisos_data = rol_repository.get_rol_permisos(db, rol_id)
    
    # Convertir a PermisoResponse si es necesario
    from schemas.schemas import PermisoResponse
    permisos = [
        PermisoResponse(**p) if isinstance(p, dict) else p
        for p in permisos_data
    ]

    rol_dict = _dump_model(_validate_response(RolResponse, rol))
    rol_dict["permisos"] = permisos
    return RolWithPermisos(**rol_dict)


def get_all_roles(db: Session, skip: int = 0, limit: int = 100) -> List[RolResponse]:
    """Obtener todos los roles con paginación"""
    roles = rol_repository.get_all_roles(db, skip, limit)
    return [_validate_response(RolResponse, r) for r in roles]


def update_rol(db: Session, rol_id: int, rol_data: RolUpdate) -> RolResponse:
    """Actualizar un rol existente con validaciones"""
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Validar nombre único si se está actualizando
    if rol_data.nombre_rol:
        existing = rol_repository.get_rol_by_nombre(db, rol_data.nombre_rol)
        if existing and existing.id != rol_id:
            raise HTTPException(
                status_code=400, detail=f"El rol '{rol_data.nombre_rol}' ya existe"
            )

    try:
        update_data = _dump_model_exclude_unset(rol_data)
        rol_updated = rol_repository.update_rol(db, rol_id, update_data)
        logger.info(f"Rol actualizado: {rol_updated.nombre_rol}")
        return _validate_response(RolResponse, rol_updated)
    except Exception as e:
        logger.error(f"Error al actualizar rol: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al actualizar rol")


def delete_rol(db: Session, rol_id: int) -> dict:
    """Eliminar un rol"""
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    try:
        rol_repository.delete_rol(db, rol_id)
        logger.info(f"Rol eliminado: {rol.nombre_rol}")
        return {"message": "Rol eliminado exitosamente"}
    except Exception as e:
        logger.error(f"Error al eliminar rol: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al eliminar rol")


def asignar_permiso(db: Session, rol_id: int, permiso_id: int) -> dict:
    """Asignar un permiso a un rol"""
    # Validar que el rol exista
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Validar que el permiso exista
    permiso = permiso_repository.get_permiso_by_id(db, permiso_id)
    if not permiso:
        raise HTTPException(status_code=404, detail="Permiso no encontrado")

    # Asignar permiso
    success = rol_repository.asignar_permiso_a_rol(db, rol_id, permiso_id)
    if not success:
        raise HTTPException(
            status_code=400, detail="El permiso ya está asignado a este rol"
        )

    logger.info(
        f"Permiso '{permiso.nombre_permiso}' asignado al rol '{rol.nombre_rol}'"
    )
    return {"message": f"Permiso '{permiso.nombre_permiso}' asignado exitosamente"}


def remover_permiso(db: Session, rol_id: int, permiso_id: int) -> dict:
    """Remover un permiso de un rol"""
    # Validar que el rol exista
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Remover permiso
    success = rol_repository.remover_permiso_de_rol(db, rol_id, permiso_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="El rol no tiene este permiso asignado"
        )

    logger.info(f"Permiso removido del rol '{rol.nombre_rol}'")
    return {"message": "Permiso removido exitosamente"}