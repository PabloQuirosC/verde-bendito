from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.inventario import InventarioService
from schemas.operaciones_schemas import InventarioCreate, InventarioResponse, GenericResponse, PaginatedResponse
from typing import List
from utils.auditoria_utils import log_auditoria

inventario_router = APIRouter()


@inventario_router.post(
    "/",
    response_model=GenericResponse,
    tags=["inventario"],
    summary="Registrar movimiento de inventario",
    description="Crea un nuevo movimiento de inventario y actualiza el stock del producto"
)
def crear_movimiento(
    data: InventarioCreate,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear un movimiento de inventario"""
    service = InventarioService(db)
    movimiento = service.crear_movimiento(data, usuario_id=None)

    if not movimiento:
        raise HTTPException(status_code=400, detail="Error al registrar el movimiento de inventario")

    # Registrar auditoría con antes/después de stock
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="MOVIMIENTO_INVENTARIO", modulo="inventario", tabla_afectada="inventario", registro_id=movimiento.id, datos_antes={"producto_id": movimiento.producto_id, "stock_anterior": movimiento.cantidad_anterior}, datos_despues={"producto_id": movimiento.producto_id, "stock_nuevo": movimiento.cantidad_nueva, "cambio": movimiento.cantidad_cambio})
    except Exception:
        pass

    return GenericResponse(
        success=True,
        code=201,
        message="Movimiento de inventario registrado exitosamente",
        data={
            "id": movimiento.id,
            "producto_id": movimiento.producto_id,
            "tipo_movimiento": movimiento.tipo_movimiento,
            "cantidad_anterior": movimiento.cantidad_anterior,
            "cantidad_nueva": movimiento.cantidad_nueva,
            "cantidad_cambio": movimiento.cantidad_cambio,
            "proveedor_id": movimiento.proveedor_id,
            "compra_id": movimiento.compra_id,
            "fecha_movimiento": movimiento.fecha_movimiento.isoformat(),
        }
    )


@inventario_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["inventario"],
    summary="Listar movimientos de inventario",
    description="Lista todos los movimientos de inventario con paginación"
)
def listar_movimientos(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar movimientos de inventario"""
    service = InventarioService(db)
    movimientos = service.listar_movimientos(skip, limit)

    data = [
        {
            "id": m.id,
            "producto_id": m.producto_id,
            "cantidad_anterior": m.cantidad_anterior,
            "cantidad_nueva": m.cantidad_nueva,
            "cantidad_cambio": m.cantidad_cambio,
            "tipo_movimiento": m.tipo_movimiento,
            "razon": m.razon,
            "proveedor_id": m.proveedor_id,
            "compra_id": m.compra_id,
            "fecha_movimiento": m.fecha_movimiento.isoformat() if m.fecha_movimiento else None,
        }
        for m in movimientos
    ]

    return PaginatedResponse(
        success=True,
        code=200,
        message="Movimientos de inventario obtenidos exitosamente",
        total=len(movimientos),
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(len(movimientos) + limit - 1) // limit if limit > 0 else 1,
        data=data
    )


@inventario_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["inventario"],
    summary="Obtener movimiento de inventario",
    description="Obtiene un movimiento de inventario por su ID"
)
def obtener_movimiento(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener un movimiento de inventario"""
    service = InventarioService(db)
    movimiento = service.obtener_movimiento(id)

    if not movimiento:
        raise HTTPException(status_code=404, detail="Movimiento de inventario no encontrado")

    return GenericResponse(
        success=True,
        code=200,
        message="Movimiento de inventario obtenido exitosamente",
        data={
            "id": movimiento.id,
            "producto_id": movimiento.producto_id,
            "cantidad_anterior": movimiento.cantidad_anterior,
            "cantidad_nueva": movimiento.cantidad_nueva,
            "cantidad_cambio": movimiento.cantidad_cambio,
            "tipo_movimiento": movimiento.tipo_movimiento,
            "razon": movimiento.razon,
            "proveedor_id": movimiento.proveedor_id,
            "compra_id": movimiento.compra_id,
            "fecha_movimiento": movimiento.fecha_movimiento.isoformat() if movimiento.fecha_movimiento else None,
        }
    )


@inventario_router.get(
    "/producto/{producto_id}",
    response_model=GenericResponse,
    tags=["inventario"],
    summary="Movimientos de un producto",
    description="Obtiene todos los movimientos de inventario de un producto específico"
)
def movimientos_por_producto(
    producto_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener movimientos de un producto"""
    service = InventarioService(db)
    movimientos = service.movimientos_por_producto(producto_id, skip, limit)

    data = [
        {
            "id": m.id,
            "cantidad_anterior": m.cantidad_anterior,
            "cantidad_nueva": m.cantidad_nueva,
            "cantidad_cambio": m.cantidad_cambio,
            "tipo_movimiento": m.tipo_movimiento,
            "razon": m.razon,
            "proveedor_id": m.proveedor_id,
            "compra_id": m.compra_id,
            "fecha_movimiento": m.fecha_movimiento.isoformat() if m.fecha_movimiento else None,
        }
        for m in movimientos
    ]

    return GenericResponse(
        success=True,
        code=200,
        message=f"Movimientos del producto {producto_id}",
        data=data
    )


@inventario_router.get(
    "/tipo/{tipo_movimiento}",
    response_model=GenericResponse,
    tags=["inventario"],
    summary="Movimientos por tipo",
    description="Obtiene movimientos de inventario filtrados por tipo"
)
def movimientos_por_tipo(
    tipo_movimiento: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener movimientos por tipo"""
    service = InventarioService(db)
    movimientos = service.movimientos_por_tipo(tipo_movimiento, skip, limit)

    data = [
        {
            "id": m.id,
            "producto_id": m.producto_id,
            "cantidad_cambio": m.cantidad_cambio,
            "razon": m.razon,
            "proveedor_id": m.proveedor_id,
            "compra_id": m.compra_id,
            "fecha_movimiento": m.fecha_movimiento.isoformat() if m.fecha_movimiento else None,
        }
        for m in movimientos
    ]

    return GenericResponse(
        success=True,
        code=200,
        message=f"Movimientos de tipo {tipo_movimiento}",
        data=data
    )
