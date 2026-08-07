from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

from database.dependencies import get_db_app_comandas
from models.proveedor import Proveedor
from schemas.operaciones_schemas import ProveedorCreate, ProveedorUpdate, ProveedorResponse, ProveedorEstadoFiltro
from service.proveedor.proveedor_service import (
    create_proveedor,
    get_proveedor,
    get_all_proveedores,
    update_proveedor,
    delete_proveedor,
)

proveedor_router = APIRouter()


@proveedor_router.get("/estados", response_model=List[ProveedorEstadoFiltro], tags=["proveedores"])
def listar_estados_proveedor(
    db: Session = Depends(get_db_app_comandas),
):
    rows = db.query(Proveedor.activo, func.count(Proveedor.id).label("cantidad")).group_by(Proveedor.activo).all()
    cantidades = {int(activo): int(cantidad) for activo, cantidad in rows}
    total = sum(cantidades.values())

    return [
        {"codigo": "todos", "etiqueta": "Todos", "activo": None, "cantidad": total},
        {"codigo": "activos", "etiqueta": "Activos", "activo": 1, "cantidad": cantidades.get(1, 0)},
        {"codigo": "inactivos", "etiqueta": "Inactivos", "activo": 0, "cantidad": cantidades.get(0, 0)},
    ]


@proveedor_router.post("/", response_model=ProveedorResponse, tags=["proveedores"], status_code=201)
def crear_proveedor(
    proveedor: ProveedorCreate,
    db: Session = Depends(get_db_app_comandas),
):
    return create_proveedor(db, proveedor)


@proveedor_router.get("/{proveedor_id}", response_model=ProveedorResponse, tags=["proveedores"])
def obtener_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    return get_proveedor(db, proveedor_id)


@proveedor_router.get("/", response_model=List[ProveedorResponse], tags=["proveedores"])
def listar_proveedores(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas),
):
    return get_all_proveedores(db, skip, limit)


@proveedor_router.put("/{proveedor_id}", response_model=ProveedorResponse, tags=["proveedores"])
def actualizar_proveedor(
    proveedor_id: int,
    proveedor: ProveedorUpdate,
    db: Session = Depends(get_db_app_comandas),
):
    return update_proveedor(db, proveedor_id, proveedor)


@proveedor_router.delete("/{proveedor_id}", tags=["proveedores"])
def eliminar_proveedor(
    proveedor_id: int,
    db: Session = Depends(get_db_app_comandas),
):
    return delete_proveedor(db, proveedor_id)
