"""Controller/Router para endpoints de logs"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database.connection import get_db_sicap
from service.log.log_service import (
    obtener_todos_los_logs,
    registrar_log,
    obtener_logs_por_transaccion,
    obtener_logs_por_usuario,
)
from schemas.log_schema import LogRequest, LogResponse

log_router = APIRouter()


@log_router.get("/", tags=["logs"])
async def get_all_logs(
    page: int = Query(1, ge=1, description="Número de página"),
    items_per_page: int = Query(10, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db_sicap),
):
    """
    Obtiene todos los logs del sistema con paginación.
    """
    return obtener_todos_los_logs(db, page=page, items_per_page=items_per_page)


@log_router.post("/", response_model=LogResponse, tags=["logs"])
async def crear_log(
    log_data: LogRequest,
    db: Session = Depends(get_db_sicap),
):
    """
    Registra un nuevo log en el sistema.
    """
    return registrar_log(db, log_data)


@log_router.get("/transaccion/{transaccion_id}", tags=["logs"])
async def get_logs_by_transaccion(
    transaccion_id: int,
    page: int = Query(1, ge=1, description="Número de página"),
    items_per_page: int = Query(10, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db_sicap),
):
    """
    Obtiene todos los logs asociados a una transacción específica con paginación.
    """
    return obtener_logs_por_transaccion(
        db, transaccion_id=transaccion_id, page=page, items_per_page=items_per_page
    )


@log_router.get("/usuario/{usuario_id}", tags=["logs"])
async def get_logs_by_usuario(
    usuario_id: int,
    page: int = Query(1, ge=1, description="Número de página"),
    items_per_page: int = Query(10, ge=1, le=100, description="Items por página"),
    db: Session = Depends(get_db_sicap),
):
    """
    Obtiene todos los logs asociados a un usuario específico con paginación.
    """
    return obtener_logs_por_usuario(
        db, usuario_id=usuario_id, page=page, items_per_page=items_per_page
    )

