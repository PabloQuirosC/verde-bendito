from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.mesa.mesa_service import MesaService
from schemas.operaciones_schemas import (
    MesaCreate, MesaUpdate, MesaResponse, GenericResponse, PaginatedResponse
)

mesa_router = APIRouter()


@mesa_router.post(
    "/",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Crear mesa",
    description="Crea una nueva mesa en el sistema"
)
def crear_mesa(
    data: MesaCreate,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear una nueva mesa"""
    service = MesaService(db)
    mesa = service.crear_mesa(data)
    
    if not mesa:
        raise HTTPException(status_code=400, detail="Error al crear la mesa")
    
    return GenericResponse(
        success=True,
        code=201,
        message="Mesa creada exitosamente",
        data={"id": mesa.id, "numero": mesa.numero}
    )


@mesa_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Obtener mesa",
    description="Obtiene una mesa por su ID"
)
def obtener_mesa(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener una mesa por ID"""
    service = MesaService(db)
    mesa = service.obtener_mesa(id)
    
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Mesa obtenida exitosamente",
        data={
            "id": mesa.id,
            "numero": mesa.numero,
            "capacidad": mesa.capacidad,
            "estado": mesa.estado,
            "ubicacion": mesa.ubicacion
        }
    )


@mesa_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["mesas"],
    summary="Listar mesas",
    description="Lista todas las mesas con paginación"
)
def listar_mesas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar mesas"""
    service = MesaService(db)
    mesas = service.listar_mesas(skip, limit)
    
    data = [
        {
            "id": m.id,
            "numero": m.numero,
            "capacidad": m.capacidad,
            "estado": m.estado,
            "ubicacion": m.ubicacion,
            "activo": m.activo
        }
        for m in mesas
    ]
    
    return PaginatedResponse(
        success=True,
        code=200,
        message="Mesas obtenidas exitosamente",
        total=len(mesas),
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(len(mesas) + limit - 1) // limit if limit > 0 else 1,
        data=data
    )


@mesa_router.put(
    "/{id}",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Actualizar mesa",
    description="Actualiza una mesa existente"
)
def actualizar_mesa(
    id: int,
    data: MesaUpdate,
    db: Session = Depends(get_db_app_comandas)
):
    """Actualizar una mesa"""
    service = MesaService(db)
    mesa = service.actualizar_mesa(id, data)
    
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Mesa actualizada exitosamente",
        data={"id": mesa.id}
    )


@mesa_router.delete(
    "/{id}",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Eliminar mesa",
    description="Elimina una mesa del sistema"
)
def eliminar_mesa(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Eliminar una mesa"""
    service = MesaService(db)
    mesa = service.eliminar_mesa(id)
    
    if not mesa:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Mesa eliminada exitosamente",
        data={"id": mesa.id}
    )


@mesa_router.get(
    "/disponibles/list",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Mesas disponibles",
    description="Obtiene todas las mesas disponibles"
)
def mesas_disponibles(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener mesas disponibles"""
    service = MesaService(db)
    mesas = service.obtener_mesas_disponibles()
    
    data = [
        {
            "id": m.id,
            "numero": m.numero,
            "capacidad": m.capacidad,
            "ubicacion": m.ubicacion
        }
        for m in mesas
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Mesas disponibles obtenidas",
        data=data
    )


@mesa_router.get(
    "/ocupadas/list",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Mesas ocupadas",
    description="Obtiene todas las mesas ocupadas"
)
def mesas_ocupadas(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener mesas ocupadas"""
    service = MesaService(db)
    mesas = service.obtener_mesas_ocupadas()
    
    data = [
        {
            "id": m.id,
            "numero": m.numero,
            "estado": m.estado
        }
        for m in mesas
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Mesas ocupadas obtenidas",
        data=data
    )


@mesa_router.get(
    "/ocupadas/dashboard",
    response_model=GenericResponse,
    tags=["mesas"],
    summary="Dashboard de mesas ocupadas",
    description="Obtiene mesas ocupadas con detalles de comandas para dashboard"
)
def mesas_ocupadas_dashboard(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener mesas ocupadas con detalles para dashboard"""
    from models.comanda import Comanda
    from models.mesa import Mesa
    
    try:
        mesas = db.query(Mesa).filter(Mesa.estado == 'ocupada', Mesa.activo == 1).all()
        
        data = []
        for m in mesas:
            # obtener comanda abierta en mesa
            comanda = db.query(Comanda).filter(
                Comanda.mesa_id == m.id,
                Comanda.estado == 'abierta'
            ).first()
            
            mesa_data = {
                "id": m.id,
                "numero": m.numero,
                "capacidad": m.capacidad,
                "estado": m.estado,
                "comanda_id": comanda.id if comanda else None,
                "comanda_numero": comanda.numero if comanda else None,
                # Usar COUNT para evitar cargar relaciones que puedan referenciar columnas no existentes
                "items_count": 0,
                "total": float(comanda.total or 0) if comanda else 0,
                "tiempo_abierta": None
            }
            
            if comanda:
                try:
                    from models.detalle_comanda import DetalleComanda
                    items_count = db.query(DetalleComanda.id).filter(DetalleComanda.comanda_id == comanda.id).count()
                    mesa_data["items_count"] = items_count
                except Exception:
                    # Fallback si la tabla/columna no están sincronizadas
                    mesa_data["items_count"] = 0
                from datetime import datetime
                now = datetime.utcnow()
                delta = now - comanda.fecha_creacion
                mesa_data["tiempo_abierta"] = round(delta.total_seconds() / 60, 0)  # minutos
            
            data.append(mesa_data)
        
        return GenericResponse(
            success=True,
            code=200,
            message="Dashboard de mesas ocupadas",
            data=data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
