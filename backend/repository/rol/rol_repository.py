from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from models.rol import Rol
from models.permiso import Permiso
from models.rol_permiso import RolPermiso


def create_rol(db: Session, rol_data: dict) -> Rol:
    """Crear un nuevo rol"""
    rol = Rol(**rol_data)
    db.add(rol)
    db.commit()
    db.refresh(rol)
    return rol


def get_rol_by_id(db: Session, rol_id: int) -> Optional[Rol]:
    """Obtener un rol por ID"""
    return db.query(Rol).filter(Rol.id == rol_id).first()


def get_rol_by_nombre(db: Session, nombre_rol: str) -> Optional[Rol]:
    """Obtener un rol por nombre"""
    return db.query(Rol).filter(Rol.nombre_rol == nombre_rol).first()


def get_all_roles(db: Session, skip: int = 0, limit: int = 100) -> List[Rol]:
    """Obtener todos los roles con paginación"""
    return db.query(Rol).offset(skip).limit(limit).all()


def update_rol(db: Session, rol_id: int, rol_data: dict) -> Optional[Rol]:
    """Actualizar un rol existente"""
    rol = db.query(Rol).filter(Rol.id == rol_id).first()
    if not rol:
        return None

    for key, value in rol_data.items():
        if value is not None:
            setattr(rol, key, value)

    db.commit()
    db.refresh(rol)
    return rol


def delete_rol(db: Session, rol_id: int) -> bool:
    """Eliminar un rol y sus relaciones"""
    rol = db.query(Rol).filter(Rol.id == rol_id).first()
    if not rol:
        return False

    # Primero eliminar todas las relaciones de rol_permiso
    db.query(RolPermiso).filter(RolPermiso.rol_id == rol_id).delete()
    
    # Eliminar todas las relaciones de usuario_rol
    from models.usuario_rol import UsuarioRol
    db.query(UsuarioRol).filter(UsuarioRol.rol_id == rol_id).delete()
    
    # Finalmente eliminar el rol
    db.delete(rol)
    db.commit()
    return True


def get_rol_permisos(db: Session, rol_id: int) -> List[dict]:
    """Obtener lista de permisos con sus detalles asignados a un rol"""
    result = (
        db.query(Permiso)
        .join(RolPermiso, Permiso.id == RolPermiso.permiso_id)
        .filter(RolPermiso.rol_id == rol_id)
        .all()
    )
    return [
        {
            "id": p.id,
            "nombre_permiso": p.nombre_permiso,
            "modulo": p.modulo,
            "descripcion": p.descripcion,
        }
        for p in result
    ] if result else []


def asignar_permiso_a_rol(db: Session, rol_id: int, permiso_id: int) -> bool:
    """Asignar un permiso a un rol"""
    # Verificar si ya existe la asignación
    existing = (
        db.query(RolPermiso)
        .filter(RolPermiso.rol_id == rol_id, RolPermiso.permiso_id == permiso_id)
        .first()
    )

    if existing:
        return False

    rol_permiso = RolPermiso(rol_id=rol_id, permiso_id=permiso_id)
    db.add(rol_permiso)
    db.commit()
    return True


def remover_permiso_de_rol(db: Session, rol_id: int, permiso_id: int) -> bool:
    """Remover un permiso de un rol"""
    rol_permiso = (
        db.query(RolPermiso)
        .filter(RolPermiso.rol_id == rol_id, RolPermiso.permiso_id == permiso_id)
        .first()
    )

    if not rol_permiso:
        return False

    db.delete(rol_permiso)
    db.commit()
    return True


def count_roles(db: Session) -> int:
    """Contar total de roles"""
    return db.query(func.count(Rol.id)).scalar()