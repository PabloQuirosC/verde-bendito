from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from database.dependencies import get_db_inmocr
from services import UsuarioService, get_current_user
from schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from utils.auth_middleware import requiere_modulo

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])


@router.get("/publico/{usuario}", response_model=UsuarioResponse)
async def obtener_usuario_publico(
    usuario: str,
    db: Session = Depends(get_db_inmocr)
):
    """
    Obtener información pública del usuario/corredor (sin autenticación)
    """
    return UsuarioService.get_usuario(db, usuario)


@router.get("/", response_model=List[UsuarioResponse])
async def listar_usuarios(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Listar todos los usuarios
    Requiere permiso de lectura en módulo de usuarios
    """
    # Validar acceso al módulo de usuarios (asumiendo ID 1)
    requiere_modulo(1, "read")(current_user)
    
    return UsuarioService.list_usuarios(db, skip, limit)


@router.get("/{usuario}", response_model=UsuarioResponse)
async def obtener_usuario(
    usuario: str,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener usuario por nombre de usuario
    """
    requiere_modulo(1, "read")(current_user)
    
    return UsuarioService.get_usuario(db, usuario)


@router.post("/", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_data: UsuarioCreate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Crear nuevo usuario
    Requiere permiso de escritura en módulo de usuarios
    """
    requiere_modulo(1, "write")(current_user)
    
    return UsuarioService.create_usuario(db, usuario_data)


@router.put("/{usuario}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario: str,
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar usuario existente
    """
    requiere_modulo(1, "write")(current_user)
    
    return UsuarioService.update_usuario(db, usuario, usuario_data)


@router.put("/perfil/me", response_model=UsuarioResponse)
async def actualizar_perfil_propio(
    usuario_data: UsuarioUpdate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar el propio perfil del usuario autenticado
    No requiere permisos especiales
    """
    usuario = current_user.get('usuario')
    return UsuarioService.update_usuario(db, usuario, usuario_data)


@router.delete("/{usuario}")
async def eliminar_usuario(
    usuario: str,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar usuario
    """
    requiere_modulo(1, "write")(current_user)
    
    return UsuarioService.delete_usuario(db, usuario)
