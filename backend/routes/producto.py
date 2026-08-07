from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.producto.producto_service import ProductoService
from schemas.operaciones_schemas import (
    ProductoCreate, ProductoUpdate, GenericResponse, PaginatedResponse
)
from utils.auditoria_utils import log_auditoria

producto_router = APIRouter()


@producto_router.post(
    "/",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Crear producto",
    description="Crea un nuevo producto en el sistema"
)
def crear_producto(
    data: ProductoCreate,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear un nuevo producto"""
    service = ProductoService(db)
    producto = service.crear_producto(data)
    
    if not producto:
        raise HTTPException(status_code=400, detail="Error al crear el producto")
    # Registrar auditoría más informativa
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="CREAR_PRODUCTO", modulo="producto", tabla_afectada="producto", registro_id=producto.id, datos_antes=None, datos_despues={"id": producto.id, "nombre": producto.nombre, "precio": float(producto.precio), "stock": producto.stock})
    except Exception:
        pass
    
    return GenericResponse(
        success=True,
        code=201,
        message="Producto creado exitosamente",
        data={
            "id": producto.id,
            "nombre": producto.nombre,
            "precio": float(producto.precio),
            "stock": producto.stock,
            "categoria_id": producto.categoria_id,
            "activo": bool(producto.activo),
        }
    )


@producto_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Obtener producto",
    description="Obtiene un producto por su ID"
)
def obtener_producto(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener un producto por ID"""
    service = ProductoService(db)
    producto = service.obtener_producto(id)
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Producto obtenido exitosamente",
        data={
            "id": producto.id,
            "nombre": producto.nombre,
            "precio": float(producto.precio),
            "stock": producto.stock,
            "categoria_id": producto.categoria_id,
            "activo": bool(producto.activo),
        }
    )


@producto_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["productos"],
    summary="Listar productos",
    description="Lista todos los productos activos con paginación"
)
def listar_productos(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar productos activos"""
    service = ProductoService(db)
    productos = service.listar_productos(skip, limit)
    
    data = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio": float(p.precio),
            "stock": p.stock,
            "categoria_id": p.categoria_id,
            "activo": bool(p.activo),
        }
        for p in productos
    ]
    
    return PaginatedResponse(
        success=True,
        code=200,
        message="Productos obtenidos exitosamente",
        total=len(productos),
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(len(productos) + limit - 1) // limit if limit > 0 else 1,
        data=data
    )


@producto_router.put(
    "/{id}",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Actualizar producto",
    description="Actualiza un producto existente"
)
def actualizar_producto(
    id: int,
    data: ProductoUpdate,
    db: Session = Depends(get_db_app_comandas)
):
    """Actualizar un producto"""
    service = ProductoService(db)
    antes = service.obtener_producto(id)
    antes_dict = None
    if antes:
        antes_dict = {"id": antes.id, "nombre": antes.nombre, "precio": float(antes.precio), "stock": antes.stock}

    producto = service.actualizar_producto(id, data)
    
    if not producto:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    # Registrar auditoría con antes/despues
    try:
        despues_dict = {"id": producto.id, "nombre": producto.nombre, "precio": float(producto.precio), "stock": producto.stock}
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="ACTUALIZAR_PRODUCTO", modulo="producto", tabla_afectada="producto", registro_id=producto.id, datos_antes=antes_dict, datos_despues=despues_dict)
    except Exception:
        pass
    
    return GenericResponse(
        success=True,
        code=200,
        message="Producto actualizado exitosamente",
        data={"id": producto.id}
    )


@producto_router.delete(
    "/{id}",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Eliminar producto",
    description="Elimina un producto (soft delete)"
)
def eliminar_producto(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Eliminar un producto"""
    service = ProductoService(db)
    antes = service.obtener_producto(id)
    antes_dict = None
    if antes:
        antes_dict = {"id": antes.id, "nombre": antes.nombre, "precio": float(antes.precio), "stock": antes.stock}

    resultado = service.eliminar_producto(id)
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="ELIMINAR_PRODUCTO", modulo="producto", tabla_afectada="producto", registro_id=id, datos_antes=antes_dict, datos_despues={"activo": 0})
    except Exception:
        pass
    
    return GenericResponse(
        success=True,
        code=200,
        message="Producto eliminado exitosamente"
    )


@producto_router.get(
    "/categoria/{categoria_id}",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Obtener productos por categoría",
    description="Obtiene todos los productos de una categoría específica"
)
def obtener_productos_por_categoria(
    categoria_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener productos de una categoría"""
    service = ProductoService(db)
    productos = service.obtener_por_categoria(categoria_id)
    
    data = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "precio": float(p.precio),
            "stock": p.stock,
            "activo": bool(p.activo),
        }
        for p in productos
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Productos de la categoría",
        data=data
    )


@producto_router.get(
    "/bajo-stock",
    response_model=GenericResponse,
    tags=["productos"],
    summary="Productos con stock bajo",
    description="Obtiene productos que están bajo el stock mínimo"
)
def obtener_bajo_stock(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener productos con stock bajo"""
    service = ProductoService(db)
    productos = service.obtener_bajo_stock()
    
    data = [
        {
            "id": p.id,
            "nombre": p.nombre,
            "stock": p.stock,
            "stock_minimo": p.stock_minimo
        }
        for p in productos
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Productos con stock bajo",
        data=data
    )
