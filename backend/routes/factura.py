from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.factura.factura_service import FacturaService
from schemas.operaciones_schemas import FacturaCreate, GenericResponse
from utils.auditoria_utils import log_auditoria
from notifications.manager import manager as notifications_manager

factura_router = APIRouter()


@factura_router.post('/', response_model=GenericResponse, tags=['facturas'], summary='Crear factura')
def crear_factura(data: FacturaCreate, db: Session = Depends(get_db_app_comandas)):
    service = FacturaService(db)
    factura = service.crear_factura(data)
    if not factura:
        raise HTTPException(status_code=400, detail='Error al crear factura')
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="CREAR_FACTURA", modulo="factura", tabla_afectada="factura", registro_id=factura.id, datos_antes=None, datos_despues={"id": factura.id, "numero_factura": factura.numero_factura, "comanda_id": factura.comanda_id})
    except Exception:
        pass
    # Notificar a topic 'caja' si la factura quedó pendiente de pago
    try:
        if getattr(factura, 'estado_pago', None) in (None, 'pendiente'):
            payload = {
                "type": "factura_pendiente",
                "factura_id": factura.id,
                "numero_factura": getattr(factura, 'numero_factura', None),
                "comanda_id": getattr(factura, 'comanda_id', None),
                "total": float(getattr(factura, 'total', 0) or 0),
                "title": f"Factura pendiente #{getattr(factura, 'numero_factura', factura.id)}",
                "desc": f"Total: {float(getattr(factura, 'total', 0) or 0)}"
            }
            import asyncio
            try:
                asyncio.create_task(notifications_manager.broadcast('caja', {"topic": "caja", "payload": payload}))
            except Exception:
                # fallback synchronous send (best effort)
                try:
                    import nest_asyncio
                except Exception:
                    pass
    except Exception:
        pass
    return GenericResponse(success=True, code=201, message='Factura creada', data={'id': factura.id, 'numero_factura': factura.numero_factura})


@factura_router.get('/{id}', response_model=GenericResponse, tags=['facturas'], summary='Obtener factura')
def obtener_factura(id: int, db: Session = Depends(get_db_app_comandas)):
    service = FacturaService(db)
    factura = service.repo.get_by_id(id)
    if not factura:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    data = {
        'id': factura.id,
        'numero_factura': factura.numero_factura,
        'comanda_id': factura.comanda_id,
        'cliente_id': factura.cliente_id,
        'subtotal': float(factura.subtotal or 0),
        'impuesto': float(factura.impuesto or 0),
        'total': float(factura.total or 0),
        'estado_pago': factura.estado_pago
    }
    return GenericResponse(success=True, code=200, message='Factura obtenida', data=data)


@factura_router.put('/{id}/anular', response_model=GenericResponse, tags=['facturas'], summary='Anular factura')
def anular_factura(id: int, db: Session = Depends(get_db_app_comandas)):
    service = FacturaService(db)
    factura = service.repo.get_by_id(id)
    if not factura:
        raise HTTPException(status_code=404, detail='Factura no encontrada')
    
    # Registrar auditoría antes de anular
    try:
        log_auditoria(
            db=db,
            usuario_id=None,
            nombre_usuario=None,
            accion="ANULAR_FACTURA",
            modulo="factura",
            tabla_afectada="factura",
            registro_id=factura.id,
            datos_antes={"id": factura.id, "numero_factura": factura.numero_factura, "estado": getattr(factura, 'estado', None), "total": float(factura.total or 0)},
            datos_despues={"id": factura.id, "numero_factura": factura.numero_factura, "estado": "anulada", "total": float(factura.total or 0)}
        )
    except Exception:
        pass
    
    # Anular la factura (cambiar estado a "anulada")
    factura.estado = "anulada"
    db.commit()
    
    return GenericResponse(success=True, code=200, message='Factura anulada')
