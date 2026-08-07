from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Optional, Tuple, List
from datetime import datetime
from models.usuario import Usuario
from models.rol import Rol
from models.permiso import Permiso
from models.usuario_rol import UsuarioRol
from models.rol_permiso import RolPermiso


def check_database_connection(db: Session) -> bool:
    """Verificar si la conexión a la base de datos está activa"""
    try:
        db.execute(text("SELECT 1 FROM DUAL"))
        return True
    except Exception:
        return False


def get_usuario_by_username(db: Session, username: str) -> Optional[Tuple]:
    result = (
        db.query(Usuario.id, Usuario.nombre_usuario, Usuario.activo)
        .filter(Usuario.nombre_usuario == username)
        .first()
    )
    return result


def get_email_by_id(db: Session, user_id: int) -> Optional[str]:
    result = db.query(Usuario.email).filter(Usuario.id == user_id).first()
    return result[0] if result else None


def get_all_users(db: Session, page: int, items_per_page: int) -> List[Usuario]:
    offset = (page - 1) * items_per_page
    return db.query(Usuario).offset(offset).limit(items_per_page).all()


# ============ CRUD Usuario ============
def create_usuario(db: Session, usuario_data: dict) -> Usuario:
    """Crear un nuevo usuario"""
    usuario = Usuario(**usuario_data)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


def get_usuario_by_id(db: Session, usuario_id: int) -> Optional[Usuario]:
    """Obtener un usuario por ID"""
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_all_usuarios(db: Session, skip: int = 0, limit: int = 100) -> List[Usuario]:
    """Obtener todos los usuarios con paginación"""
    return db.query(Usuario).offset(skip).limit(limit).all()


def update_usuario(
    db: Session, usuario_id: int, usuario_data: dict
) -> Optional[Usuario]:
    """Actualizar un usuario existente"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        return None

    for key, value in usuario_data.items():
        if value is not None:
            setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return usuario


def delete_usuario(db: Session, usuario_id: int) -> bool:
    """Eliminar un usuario y sus relaciones"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        return False

    # Primero eliminar todas las relaciones de usuario_rol
    db.query(UsuarioRol).filter(UsuarioRol.usuario_id == usuario_id).delete()
    
    # Finalmente eliminar el usuario
    db.delete(usuario)
    db.commit()
    return True


def get_usuario_roles(db: Session, usuario_id: int) -> Optional[dict]:
    """Obtener el rol asignado a un usuario (solo 1 rol por usuario)"""
    result = (
        db.query(Rol.id, Rol.nombre_rol)
        .join(UsuarioRol, Rol.id == UsuarioRol.rol_id)
        .filter(UsuarioRol.usuario_id == usuario_id)
        .first()  # Solo el primer rol
    )
    return {"id": result[0], "nombre": result[1]} if result else None


def get_usuario_permisos(db: Session, usuario_id: int) -> List[str]:
    """Obtener lista de nombres de permisos del usuario a través de sus roles"""
    result = (
        db.query(Permiso.nombre_permiso)
        .join(RolPermiso, Permiso.id == RolPermiso.permiso_id)
        .join(UsuarioRol, RolPermiso.rol_id == UsuarioRol.rol_id)
        .filter(UsuarioRol.usuario_id == usuario_id)
        .distinct()
        .all()
    )
    return [permiso[0] for permiso in result] if result else []


def asignar_rol_a_usuario(db: Session, usuario_id: int, rol_id: int) -> bool:
    """Asignar un rol a un usuario (elimina roles anteriores, solo 1 rol permitido)"""
    # Primero eliminar cualquier rol existente del usuario
    db.query(UsuarioRol).filter(UsuarioRol.usuario_id == usuario_id).delete()
    
    # Asignar el nuevo rol
    usuario_rol = UsuarioRol(usuario_id=usuario_id, rol_id=rol_id)
    db.add(usuario_rol)
    db.commit()
    return True


def remover_rol_de_usuario(db: Session, usuario_id: int, rol_id: int) -> bool:
    """Remover un rol de un usuario"""
    usuario_rol = (
        db.query(UsuarioRol)
        .filter(UsuarioRol.usuario_id == usuario_id, UsuarioRol.rol_id == rol_id)
        .first()
    )

    if not usuario_rol:
        return False

    db.delete(usuario_rol)
    db.commit()
    return True


def get_emails_by_roles(db: Session, role_names: List[str]) -> List[str]:
    """
    Obtener lista de emails de usuarios que tienen alguno de los roles especificados
    
    Args:
        db: Sesión de base de datos
        role_names: Lista de nombres de roles (ej: ['Supervisor', 'Jefatura'])
    
    Returns:
        Lista de emails de usuarios con esos roles
    """
    if not role_names:
        return []
    
    result = (
        db.query(Usuario.email)
        .join(UsuarioRol, Usuario.id == UsuarioRol.usuario_id)
        .join(Rol, UsuarioRol.rol_id == Rol.id)
        .filter(Rol.nombre_rol.in_(role_names))
        .filter(Usuario.activo == 1)  # Solo usuarios activos
        .filter(Usuario.email.isnot(None))  # Solo usuarios con email
        .distinct()
        .all()
    )
    
    return [email[0] for email in result if email[0]]


def count_usuarios(db: Session) -> int:
    """Contar total de usuarios"""
    return db.query(func.count(Usuario.id)).scalar()


def get_usuarios_activos(db: Session) -> int:
    """Obtener cantidad de usuarios activos en el sistema"""
    count = db.query(func.count(Usuario.id)).filter(Usuario.activo == 1).scalar()
    return count or 0


def actualizar_ultimo_login(db: Session, usuario_id: int) -> bool:
    """Actualizar la fecha y hora de último login de un usuario"""
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        return False
    
    usuario.fecha_ultimo_login = datetime.now()
    db.commit()
    return True