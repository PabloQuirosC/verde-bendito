from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from models.permiso import Permiso


def create_permiso(db: Session, permiso_data: dict) -> Permiso:
    """Crear un nuevo permiso"""
    permiso = Permiso(**permiso_data)
    db.add(permiso)
    db.commit()
    db.refresh(permiso)
    return permiso


def get_permiso_by_id(db: Session, permiso_id: int) -> Optional[Permiso]:
    """Obtener un permiso por ID"""
    return db.query(Permiso).filter(Permiso.id == permiso_id).first()


def get_permiso_by_nombre(db: Session, nombre_permiso: str) -> Optional[Permiso]:
    """Obtener un permiso por nombre"""
    return db.query(Permiso).filter(Permiso.nombre_permiso == nombre_permiso).first()


def get_all_permisos(db: Session, skip: int = 0, limit: int = 100) -> List[Permiso]:
    """Obtener todos los permisos con paginación"""
    return db.query(Permiso).offset(skip).limit(limit).all()


def get_permisos_by_modulo(db: Session, modulo: str) -> List[Permiso]:
    """Obtener permisos filtrados por módulo"""
    return db.query(Permiso).filter(Permiso.modulo == modulo).all()


def update_permiso(
    db: Session, permiso_id: int, permiso_data: dict
) -> Optional[Permiso]:
    """Actualizar un permiso existente"""
    permiso = db.query(Permiso).filter(Permiso.id == permiso_id).first()
    if not permiso:
        return None

    for key, value in permiso_data.items():
        if value is not None:
            setattr(permiso, key, value)

    db.commit()
    db.refresh(permiso)
    return permiso


def delete_permiso(db: Session, permiso_id: int) -> bool:
    """Eliminar un permiso"""
    permiso = db.query(Permiso).filter(Permiso.id == permiso_id).first()
    if not permiso:
        return False

    db.delete(permiso)
    db.commit()
    return True


def count_permisos(db: Session) -> int:
    """Contar total de permisos"""
    return db.query(func.count(Permiso.id)).scalar()