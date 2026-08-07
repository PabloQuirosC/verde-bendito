from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.categoria.categoria_service import CategoriaService
from schemas.operaciones_schemas import (
    CategoriaCreate, CategoriaUpdate, GenericResponse, PaginatedResponse
)

categoria_router = APIRouter()


@categoria_router.post(
    "/",
    response_model=GenericResponse,
    tags=["categorias"],
    summary="Crear categoría",
    description="Crea una nueva categoría"
)
def crear_categoria(
    data: CategoriaCreate,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear una nueva categoría"""
    service = CategoriaService(db)
    
    if service.categoria_existe(data.nombre):
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    
    categoria = service.crear_categoria(data)
    
    return GenericResponse(
        success=True,
        code=201,
        message="Categoría creada exitosamente",
        data={
            "id": categoria.id,
            "nombre": categoria.nombre,
            "emoji": categoria.emoji,
            "activo": bool(categoria.activo),
        }
    )


@categoria_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["categorias"],
    summary="Listar categorías",
    description="Lista todas las categorías del sistema"
)
def listar_categorias(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar todas las categorías"""
    service = CategoriaService(db)
    categorias = service.listar_categorias(skip=skip, limit=limit)
    total = len(service.listar_categorias())
    
    items = [
        {
            "id": c.id,
            "nombre": c.nombre,
            "emoji": c.emoji,
            "activo": bool(c.activo),
        }
        for c in categorias
    ]
    
    return PaginatedResponse(
        success=True,
        code=200,
        message="Categorías obtenidas",
        data=items,
        total=total,
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(total + limit - 1) // limit if limit > 0 else 1
    )


@categoria_router.get(
    "/{categoria_id}",
    response_model=GenericResponse,
    tags=["categorias"],
    summary="Obtener categoría",
    description="Obtiene una categoría por su ID"
)
def obtener_categoria(
    categoria_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener una categoría por ID"""
    service = CategoriaService(db)
    categoria = service.obtener_categoria(categoria_id)
    
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Categoría encontrada",
        data={
            "id": categoria.id,
            "nombre": categoria.nombre,
            "emoji": categoria.emoji,
            "activo": bool(categoria.activo),
        }
    )


@categoria_router.put(
    "/{categoria_id}",
    response_model=GenericResponse,
    tags=["categorias"],
    summary="Actualizar categoría",
    description="Actualiza una categoría existente"
)
def actualizar_categoria(
    categoria_id: int,
    data: CategoriaUpdate,
    db: Session = Depends(get_db_app_comandas)
):
    """Actualizar una categoría"""
    service = CategoriaService(db)
    categoria = service.actualizar_categoria(categoria_id, data)
    
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Categoría actualizada exitosamente",
        data={
            "id": categoria.id,
            "nombre": categoria.nombre,
            "emoji": categoria.emoji,
            "activo": bool(categoria.activo),
        }
    )


@categoria_router.delete(
    "/{categoria_id}",
    response_model=GenericResponse,
    tags=["categorias"],
    summary="Eliminar categoría",
    description="Elimina una categoría del sistema"
)
def eliminar_categoria(
    categoria_id: int,
    reassign_to: int | None = Query(None),
    db: Session = Depends(get_db_app_comandas)
):
    """Eliminar una categoría"""
    service = CategoriaService(db)

    if not service.obtener_categoria(categoria_id):
        raise HTTPException(status_code=404, detail="Categoría no encontrada")

    success = service.eliminar_categoria(categoria_id, reassign_to=reassign_to)
    if success:
        return GenericResponse(
            success=True,
            code=200,
            message="Categoría eliminada exitosamente",
            data=None
        )
    else:
        raise HTTPException(status_code=400, detail="Error al eliminar la categoría; verifica si tiene productos asociados o el id de reasignación es válido")
