from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List
from database.dependencies import get_db_inmocr
from services import PermisoService, get_current_user
from schemas.permiso import PermisoCreate, PermisoUpdate, PermisoResponse
from utils.auth_middleware import requiere_modulo

router = APIRouter(prefix="/permisos", tags=["Permisos"])


@router.get("/", response_model=List[PermisoResponse])
async def listar_permisos(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Listar todos los permisos
    Requiere permiso de lectura en módulo de permisos (asumiendo ID 3)
    """
    requiere_modulo(3, "read")(current_user)
    
    return PermisoService.list_permisos(db, skip, limit)


@router.get("/{id_permiso}", response_model=PermisoResponse)
async def obtener_permiso(
    id_permiso: int,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Obtener permiso por ID
    """
    requiere_modulo(3, "read")(current_user)
    
    return PermisoService.get_permiso(db, id_permiso)


@router.post("/", response_model=PermisoResponse, status_code=status.HTTP_201_CREATED)
async def crear_permiso(
    permiso_data: PermisoCreate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Crear nuevo permiso
    """
    requiere_modulo(3, "write")(current_user)
    
    return PermisoService.create_permiso(db, permiso_data)


@router.put("/{id_permiso}", response_model=PermisoResponse)
async def actualizar_permiso(
    id_permiso: int,
    permiso_data: PermisoUpdate,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Actualizar permiso existente
    """
    requiere_modulo(3, "write")(current_user)
    
    return PermisoService.update_permiso(db, id_permiso, permiso_data)


@router.delete("/{id_permiso}")
async def eliminar_permiso(
    id_permiso: int,
    db: Session = Depends(get_db_inmocr),
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar permiso
    """
    requiere_modulo(3, "write")(current_user)
    
    return PermisoService.delete_permiso(db, id_permiso)
