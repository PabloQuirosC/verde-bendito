from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.cliente.cliente_service import ClienteService
from schemas.operaciones_schemas import (
    ClienteCreate, ClienteUpdate, GenericResponse, PaginatedResponse
)

cliente_router = APIRouter()


@cliente_router.post(
    "/",
    response_model=GenericResponse,
    tags=["clientes"],
    summary="Crear cliente",
    description="Crea un nuevo cliente en el sistema"
)
def crear_cliente(
    data: ClienteCreate,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear un nuevo cliente"""
    service = ClienteService(db)
    cliente = service.crear_cliente(data)
    
    if not cliente:
        raise HTTPException(status_code=400, detail="Error al crear el cliente")
    
    return GenericResponse(
        success=True,
        code=201,
        message="Cliente creado exitosamente",
        data={"id": cliente.id}
    )


@cliente_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["clientes"],
    summary="Obtener cliente",
    description="Obtiene un cliente por su ID"
)
def obtener_cliente(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener un cliente por ID"""
    service = ClienteService(db)
    cliente = service.obtener_cliente(id)
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Cliente obtenido exitosamente",
        data={
            "id": cliente.id,
            "nombre": cliente.nombre,
            "apellido": cliente.apellido,
            "email": cliente.email,
            "telefono": cliente.telefono,
            "saldo_credito": str(cliente.saldo_credito or 0)
        }
    )


@cliente_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["clientes"],
    summary="Listar clientes",
    description="Lista todos los clientes activos"
)
def listar_clientes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar clientes activos"""
    service = ClienteService(db)
    clientes = service.listar_clientes(skip, limit)
    
    data = [
        {
            "id": c.id,
            "nombre": f"{c.nombre} {c.apellido or ''}".strip(),
            "email": c.email,
            "telefono": c.telefono,
            "cedula_ruc": c.cedula_ruc
        }
        for c in clientes
    ]
    
    return PaginatedResponse(
        success=True,
        code=200,
        message="Clientes obtenidos exitosamente",
        total=len(clientes),
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(len(clientes) + limit - 1) // limit if limit > 0 else 1,
        data=data
    )


@cliente_router.put(
    "/{id}",
    response_model=GenericResponse,
    tags=["clientes"],
    summary="Actualizar cliente",
    description="Actualiza un cliente existente"
)
def actualizar_cliente(
    id: int,
    data: ClienteUpdate,
    db: Session = Depends(get_db_app_comandas)
):
    """Actualizar un cliente"""
    service = ClienteService(db)
    cliente = service.actualizar_cliente(id, data)
    
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Cliente actualizado exitosamente",
        data={"id": cliente.id}
    )


@cliente_router.delete(
    "/{id}",
    response_model=GenericResponse,
    tags=["clientes"],
    summary="Eliminar cliente",
    description="Elimina un cliente (soft delete)"
)
def eliminar_cliente(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Eliminar un cliente"""
    service = ClienteService(db)
    resultado = service.eliminar_cliente(id)
    
    if not resultado:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Cliente eliminado exitosamente"
    )


@cliente_router.get(
    "/buscar/nombre",
    response_model=GenericResponse,
    tags=["clientes"],
    summary="Buscar clientes",
    description="Busca clientes por nombre"
)
def buscar_clientes(
    nombre: str = Query(..., min_length=1),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Buscar clientes por nombre"""
    service = ClienteService(db)
    clientes = service.buscar_clientes(nombre, skip, limit)
    
    data = [
        {
            "id": c.id,
            "nombre": f"{c.nombre} {c.apellido or ''}".strip(),
            "email": c.email
        }
        for c in clientes
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Clientes encontrados",
        data=data
    )
