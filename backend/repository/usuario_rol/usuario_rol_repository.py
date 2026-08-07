from sqlalchemy.orm import Session
from models.usuarios_rol import UsuarioRol
from schemas.usuario_rol import UsuarioRolCreate
from typing import List


class UsuarioRolRepository:
    
    @staticmethod
    def get_roles_by_usuario(db: Session, usuario: str) -> List[UsuarioRol]:
        """Obtener todos los roles de un usuario"""
        return db.query(UsuarioRol).filter(UsuarioRol.usuario == usuario).all()
    
    @staticmethod
    def get_usuarios_by_rol(db: Session, id_rol: int) -> List[UsuarioRol]:
        """Obtener todos los usuarios con un rol específico"""
        return db.query(UsuarioRol).filter(UsuarioRol.id_rol == id_rol).all()
    
    @staticmethod
    def assign_rol(db: Session, usuario_rol_data: UsuarioRolCreate) -> UsuarioRol:
        """Asignar un rol a un usuario"""
        db_usuario_rol = UsuarioRol(
            usuario=usuario_rol_data.usuario,
            id_rol=usuario_rol_data.id_rol
        )
        db.add(db_usuario_rol)
        db.commit()
        db.refresh(db_usuario_rol)
        return db_usuario_rol
    
    @staticmethod
    def remove_rol(db: Session, usuario: str, id_rol: int) -> bool:
        """Remover un rol de un usuario"""
        db_usuario_rol = db.query(UsuarioRol).filter(
            UsuarioRol.usuario == usuario,
            UsuarioRol.id_rol == id_rol
        ).first()
        
        if not db_usuario_rol:
            return False
        
        db.delete(db_usuario_rol)
        db.commit()
        return True
