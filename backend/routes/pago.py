from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas, get_current_user
from service.pago.pago_service import PagoService
from service.email_service import email_service
from schemas.operaciones_schemas import PagoCreate, GenericResponse
from utils.auditoria_utils import log_auditoria
from models.comanda import Comanda
from models.factura import Factura
from models.cliente import Cliente

pago_router = APIRouter()


@pago_router.post(
    "/",
    response_model=GenericResponse,
    tags=["pagos"],
    summary="Registrar pago",
    description="Registra un nuevo pago para una comanda"
)
def registrar_pago(
    data: PagoCreate,
    db: Session = Depends(get_db_app_comandas),
    current_user: dict = Depends(get_current_user)
):
    """Registrar un nuevo pago"""
    service = PagoService(db)
    pago = service.registrar_pago(data, current_user.get("user_id"))
    
    if not pago:
        raise HTTPException(status_code=400, detail="Error al registrar el pago")

    # Registrar auditoría de pago
    try:
        log_auditoria(db=db, usuario_id=current_user.get("user_id"), nombre_usuario=current_user.get("sub"), accion="REGISTRAR_PAGO", modulo="pago", tabla_afectada="pago", registro_id=pago.id, datos_antes=None, datos_despues={"id": pago.id, "comanda_id": pago.comanda_id, "monto": str(pago.monto)})
    except Exception:
        pass
    
    # Enviar factura por email si hay cliente con email
    try:
        comanda = db.query(Comanda).filter(Comanda.id == pago.comanda_id).first()
        if comanda:
            print(f"📦 Comanda encontrada: ID={comanda.id}, cliente_id={comanda.cliente_id}")
            cliente = db.query(Cliente).filter(Cliente.id == comanda.cliente_id).first() if comanda.cliente_id else None
            print(f"👤 Cliente: {cliente.nombre if cliente else 'NO ENCONTRADO'}, email={cliente.email if cliente else 'N/A'}")

            # Asegurar que siempre exista una factura para la comanda,
            # incluso si el cliente no tiene correo electrónico.
            factura = db.query(Factura).filter(Factura.comanda_id == comanda.id).first()
            if not factura:
                print(f"📄 Creando factura automáticamente para comanda {comanda.id}...")
                from datetime import datetime
                numero_factura = f"FAC-{datetime.now().strftime('%Y%m%d%H%M%S')}"

                factura = Factura(
                    numero_factura=numero_factura,
                    comanda_id=comanda.id,
                    cliente_id=cliente.id if cliente else comanda.cliente_id,
                    subtotal=float(comanda.subtotal or 0),
                    impuesto=float(comanda.impuesto or 0),
                    total=float(comanda.total or 0),
                    estado_pago='pagada',
                    usuario_id=current_user.get("user_id") if 'current_user' in locals() else None
                )
                db.add(factura)
                db.commit()
                db.refresh(factura)
                print(f"✅ Factura creada: {factura.numero_factura}")
            
            if cliente and cliente.email:
                if factura:
                    print(f"📄 Factura encontrada: {factura.numero_factura}")
                    # Preparar datos de factura
                    items = []
                    if comanda.detalles:
                        for item in comanda.detalles:
                            items.append({
                                'nombre': getattr(item.producto, 'nombre', 'Item') if item.producto else 'Item',
                                'cantidad': item.cantidad,
                                'precio': float(item.subtotal / item.cantidad) if item.cantidad > 0 else 0,
                                'subtotal': float(item.subtotal or 0)
                            })
                    
                    factura_data = {
                        'numero_factura': factura.numero_factura,
                        'comanda_id': comanda.id,
                        'cliente_nombre': f"{cliente.nombre} {cliente.apellido}".strip(),
                        'subtotal': float(factura.subtotal or 0),
                        'impuesto': float(factura.impuesto or 0),
                        'total': float(factura.total or 0),
                        'items': items
                    }
                    
                    # Enviar email
                    print(f"📧 Enviando factura a {cliente.email}...")
                    result = email_service.enviar_factura_por_email(cliente.email, factura_data)
                    print(f"📧 Resultado: {'✅ ENVIADO' if result else '❌ FALLO'}")
                else:
                    print(f"⚠️ No se pudo crear factura para comanda {comanda.id}")
            else:
                print(f"⚠️ Cliente sin email o no encontrado")
        else:
            print(f"⚠️ Comanda no encontrada (ID={pago.comanda_id})")
    except Exception as e:
        print(f"❌ Error al enviar factura por email: {str(e)}")
        import traceback
        traceback.print_exc()
        pass
    
    return GenericResponse(
        success=True,
        code=201,
        message="Pago registrado exitosamente",
        data={"id": pago.id}
    )


@pago_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["pagos"],
    summary="Obtener pago",
    description="Obtiene un pago por su ID"
)
def obtener_pago(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener un pago por ID"""
    service = PagoService(db)
    pago = service.obtener_pago(id)
    
    if not pago:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    
    return GenericResponse(
        success=True,
        code=200,
        message="Pago obtenido exitosamente",
        data={
            "id": pago.id,
            "comanda_id": pago.comanda_id,
            "monto": str(pago.monto),
            "tipo_pago": pago.tipo_pago,
            "fecha_pago": pago.fecha_pago.isoformat() if pago.fecha_pago else None
        }
    )


@pago_router.get(
    "/comanda/{comanda_id}",
    response_model=GenericResponse,
    tags=["pagos"],
    summary="Obtener pagos de comanda",
    description="Obtiene todos los pagos de una comanda específica"
)
def obtener_pagos_comanda(
    comanda_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener pagos de una comanda"""
    service = PagoService(db)
    pagos = service.obtener_pagos_comanda(comanda_id)
    total_pagado = service.obtener_total_pagado(comanda_id)
    
    data = [
        {
            "id": p.id,
            "monto": str(p.monto),
            "tipo_pago": p.tipo_pago,
            "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None
        }
        for p in pagos
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Pagos obtenidos exitosamente",
        data={
            "pagos": data,
            "total_pagado": str(total_pagado)
        }
    )


@pago_router.get(
    "/tipo/{tipo_pago}",
    response_model=GenericResponse,
    tags=["pagos"],
    summary="Obtener pagos por tipo",
    description="Obtiene pagos filtrados por tipo de pago"
)
def obtener_pagos_por_tipo(
    tipo_pago: str,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener pagos por tipo"""
    service = PagoService(db)
    pagos = service.obtener_pagos_por_tipo(tipo_pago)
    
    data = [
        {
            "id": p.id,
            "comanda_id": p.comanda_id,
            "monto": str(p.monto),
            "fecha_pago": p.fecha_pago.isoformat() if p.fecha_pago else None
        }
        for p in pagos
    ]
    
    return GenericResponse(
        success=True,
        code=200,
        message="Pagos encontrados",
        data=data
    )
