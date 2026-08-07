from sqlalchemy.orm import Session
from models.rol_permiso import RolPermiso
from schemas.rol_permiso import RolPermisoCreate
from typing import List


class RolPermisoRepository:
    
    @staticmethod
    def get_permisos_by_rol(db: Session, id_rol: int) -> List[RolPermiso]:
        """Obtener todos los permisos de un rol"""
        return db.query(RolPermiso).filter(RolPermiso.id_rol == id_rol).all()
    
    @staticmethod
    def get_roles_by_permiso(db: Session, id_permiso: int) -> List[RolPermiso]:
        """Obtener todos los roles con un permiso específico"""
        return db.query(RolPermiso).filter(RolPermiso.id_permiso == id_permiso).all()
    
    @staticmethod
    def assign_permiso(db: Session, rol_permiso_data: RolPermisoCreate) -> RolPermiso:
        """Asignar un permiso a un rol"""
        db_rol_permiso = RolPermiso(
            id_rol=rol_permiso_data.id_rol,
            id_permiso=rol_permiso_data.id_permiso
        )
        db.add(db_rol_permiso)
        db.commit()
        db.refresh(db_rol_permiso)
        return db_rol_permiso
    
    @staticmethod
    def remove_permiso(db: Session, id_rol: int, id_permiso: int) -> bool:
        """Remover un permiso de un rol"""
        db_rol_permiso = db.query(RolPermiso).filter(
            RolPermiso.id_rol == id_rol,
            RolPermiso.id_permiso == id_permiso
        ).first()
        
        if not db_rol_permiso:
            return False
        
        db.delete(db_rol_permiso)
        db.commit()
        return True
