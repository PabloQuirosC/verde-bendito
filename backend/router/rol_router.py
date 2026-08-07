from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from database.dependencies import get_db_inmocr
from services import RolService, get_current_user
from schemas.rol import RolCreate, RolUpdate, RolResponse
from utils.auth_middleware import requiere_modulo

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=List[RolResponse])
async def listar_roles(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Listar todos los roles
    Requiere permiso de lectura en módulo de roles (asumiendo ID 2)
    """
    requiere_modulo(2, "read")(current_user)
    
    return RolService.list_roles(db, skip, limit)


@router.get("/{id_rol}", response_model=RolResponse)
async def obtener_rol(
    id_rol: int,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener rol por ID
    """
    requiere_modulo(2, "read")(current_user)
    
    return RolService.get_rol(db, id_rol)


@router.post("/", response_model=RolResponse, status_code=status.HTTP_201_CREATED)
async def crear_rol(
    rol_data: RolCreate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Crear nuevo rol
    """
    requiere_modulo(2, "write")(current_user)
    
    return RolService.create_rol(db, rol_data)


@router.put("/{id_rol}", response_model=RolResponse)
async def actualizar_rol(
    id_rol: int,
    rol_data: RolUpdate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar rol existente
    """
    requiere_modulo(2, "write")(current_user)
    
    return RolService.update_rol(db, id_rol, rol_data)


@router.delete("/{id_rol}")
async def eliminar_rol(
    id_rol: int,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar rol
    """
    requiere_modulo(2, "write")(current_user)
    
    return RolService.delete_rol(db, id_rol)
