"""Service para lógica de negocio de Usuario"""

from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import List
import logging

from repository.usuario import usuario_repository
from repository.rol import rol_repository
from schemas.schemas import (
    UsuarioCreate,
    UsuarioUpdate,
    UsuarioResponse,
    UsuarioWithRoles,
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


def create_usuario(db: Session, usuario_data: UsuarioCreate) -> UsuarioWithRoles:
    """Crear un nuevo usuario con validaciones"""
    # Validar que el nombre de usuario no exista
    existing = usuario_repository.get_usuario_by_username(
        db, usuario_data.nombre_usuario
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"El nombre de usuario '{usuario_data.nombre_usuario}' ya existe",
        )

    # Validar que el email no esté registrado
    existing_email = (
        db.query(usuario_repository.Usuario)
        .filter(usuario_repository.Usuario.email == usuario_data.email)
        .first()
    )
    if existing_email:
        raise HTTPException(
            status_code=400,
            detail=f"El email '{usuario_data.email}' ya está registrado",
        )

    try:
        create_data = _dump_model(usuario_data)
        # El modelo ORM usa columna 'password'; el schema expone 'contrasena'.
        if "contrasena" in create_data:
            create_data["password"] = create_data.pop("contrasena")

        usuario = usuario_repository.create_usuario(db, create_data)
        logger.info(f"Usuario creado: {usuario.nombre_usuario}")
        
        # Retornar con rol vacío inicialmente
        usuario_dict = _dump_model(_validate_response(UsuarioResponse, usuario))
        usuario_dict["rol"] = None
        return UsuarioWithRoles(**usuario_dict)
    except Exception as e:
        logger.error(f"Error al crear usuario: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al crear usuario")


def get_usuario(db: Session, usuario_id: int) -> UsuarioWithRoles:
    """Obtener un usuario por ID con su rol"""
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Obtener rol del usuario
    rol = usuario_repository.get_usuario_roles(db, usuario_id)

    usuario_dict = _dump_model(_validate_response(UsuarioResponse, usuario))
    usuario_dict["rol"] = rol
    return UsuarioWithRoles(**usuario_dict)


def get_all_usuarios(
    db: Session, skip: int = 0, limit: int = 100
) -> List[UsuarioWithRoles]:
    """Obtener todos los usuarios con paginación y su rol"""
    usuarios = usuario_repository.get_all_usuarios(db, skip, limit)
    result = []
    for usuario in usuarios:
        # Obtener rol del usuario
        rol = usuario_repository.get_usuario_roles(db, usuario.id)
        usuario_dict = _dump_model(_validate_response(UsuarioResponse, usuario))
        usuario_dict["rol"] = rol
        result.append(UsuarioWithRoles(**usuario_dict))
    return result


def update_usuario(
    db: Session, usuario_id: int, usuario_data: UsuarioUpdate
) -> UsuarioResponse:
    """Actualizar un usuario existente con validaciones"""
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar email único si se está actualizando
    if usuario_data.email:
        existing_email = (
            db.query(usuario_repository.Usuario)
            .filter(
                usuario_repository.Usuario.email == usuario_data.email,
                usuario_repository.Usuario.id != usuario_id,
            )
            .first()
        )
        if existing_email:
            raise HTTPException(
                status_code=400,
                detail=f"El email '{usuario_data.email}' ya está registrado",
            )

    try:
        update_data = _dump_model_exclude_unset(usuario_data)
        # El modelo ORM usa columna 'password'; el schema expone 'contrasena'.
        if "contrasena" in update_data:
            update_data["password"] = update_data.pop("contrasena")

        usuario_updated = usuario_repository.update_usuario(db, usuario_id, update_data)
        logger.info(f"Usuario actualizado: {usuario_updated.nombre_usuario}")
        
        # Registrar actividad de actualización
        cambios = ", ".join([f"{k}: {v}" for k, v in update_data.items() if k != 'password'])
        return _validate_response(UsuarioResponse, usuario_updated)
    except Exception as e:
        logger.error(f"Error al actualizar usuario: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al actualizar usuario")


def delete_usuario(db: Session, usuario_id: int) -> dict:
    """Eliminar un usuario"""
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    try:
        nombre_usuario = usuario.nombre_usuario
        usuario_repository.delete_usuario(db, usuario_id)
        logger.info(f"Usuario eliminado: {nombre_usuario}")
        
        # Registrar actividad de eliminación        
        return {"message": "Usuario eliminado exitosamente"}
    except Exception as e:
        logger.error(f"Error al eliminar usuario: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al eliminar usuario")


def asignar_rol(db: Session, usuario_id: int, rol_id: int) -> dict:
    """Asignar un rol a un usuario (reemplaza cualquier rol existente)"""
    # Validar que el usuario exista
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Validar que el rol exista
    rol = rol_repository.get_rol_by_id(db, rol_id)
    if not rol:
        raise HTTPException(status_code=404, detail="Rol no encontrado")

    # Asignar rol (elimina cualquier rol anterior automáticamente)
    usuario_repository.asignar_rol_a_usuario(db, usuario_id, rol_id)

    logger.info(
        f"Rol '{rol.nombre_rol}' asignado al usuario '{usuario.nombre_usuario}'"
    )
    return {"message": f"Rol '{rol.nombre_rol}' asignado exitosamente"}


def remover_rol(db: Session, usuario_id: int, rol_id: int) -> dict:
    """Remover un rol de un usuario"""
    # Validar que el usuario exista
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    # Obtener información del rol antes de removerlo
    rol = rol_repository.get_rol_by_id(db, rol_id)

    # Remover rol
    success = usuario_repository.remover_rol_de_usuario(db, usuario_id, rol_id)
    if not success:
        raise HTTPException(
            status_code=404, detail="El usuario no tiene este rol asignado"
        )

    # Registrar actividad de remoción de rol
    if rol:

        logger.info(f"Rol removido del usuario '{usuario.nombre_usuario}'")
    return {"message": "Rol removido exitosamente"}


def get_usuario_permisos(db: Session, usuario_id: int) -> List[str]:
    """Obtener todos los permisos de un usuario a través de sus roles"""
    usuario = usuario_repository.get_usuario_by_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    return usuario_repository.get_usuario_permisos(db, usuario_id)