from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas
from service.comanda.comanda_service import ComandaService
from schemas.operaciones_schemas import (
    ComandaCreate, ComandaUpdate, DetalleComandaCreate, GenericResponse, PaginatedResponse
)
from notifications.manager import manager as notifications_manager
from models.comanda import Comanda
from utils.auditoria_utils import log_auditoria
from jose import jwt
import os

comanda_router = APIRouter()


@comanda_router.post(
    "/",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Crear comanda",
    description="Crea una nueva comanda"
)
def crear_comanda(
    data: ComandaCreate,
    request: Request,
    db: Session = Depends(get_db_app_comandas)
):
    """Crear una nueva comanda"""
    print(f"[DEBUG RUTA] ComandaCreate data: {data}")
    service = ComandaService(db)
    comanda = service.crear_comanda(data)
    print(f"[DEBUG RUTA] Comanda resultado: {comanda}")

    if not comanda:
        print("[DEBUG RUTA] Error: comanda es None")
        raise HTTPException(status_code=400, detail="Error al crear la comanda")

    print(f"[DEBUG RUTA] Comanda exitosa: id={comanda.id}, numero={comanda.numero}")
    # Si no se proporcionó mesero en la petición, intentar asignar el usuario autenticado
    try:
        if getattr(comanda, 'usuario_mesero_id', None) is None:
            auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
            if auth_header and auth_header.lower().startswith('bearer '):
                token = auth_header.split(' ', 1)[1].strip()
                try:
                    payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=[os.getenv('ALGORITHM', 'HS256')])
                    uid = payload.get('user_id') or payload.get('user_id')
                    if uid:
                        comanda.usuario_mesero_id = int(uid)
                        db.add(comanda)
                        db.commit()
                        db.refresh(comanda)
                        print(f"[DEBUG RUTA] Mesero asignado automáticamente: {uid}")
                except Exception:
                    pass
    except Exception:
        pass
    try:
        usuario_id = None
        nombre_usuario = None
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=[os.getenv('ALGORITHM', 'HS256')])
                usuario_id = payload.get('user_id') or payload.get('user_id')
                nombre_usuario = payload.get('sub') or payload.get('username')
            except Exception:
                usuario_id = None
                nombre_usuario = None
        ip = request.client.host if request.client else None
        ua = request.headers.get('user-agent')
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=nombre_usuario, accion="CREAR_COMANDA", modulo="comanda", tabla_afectada="comanda", registro_id=comanda.id, datos_antes=None, datos_despues={"id": comanda.id, "numero": comanda.numero, "mesa_id": comanda.mesa_id}, ip_usuario=ip, navegador=ua)
    except Exception:
        pass

    return GenericResponse(
        success=True,
        code=201,
        message="Comanda creada exitosamente",
        data={"id": comanda.id, "numero": comanda.numero}
    )


@comanda_router.get(
    "/",
    response_model=PaginatedResponse,
    tags=["comandas"],
    summary="Listar comandas abiertas",
    description="Lista todas las comandas abiertas"
)
def listar_comandas(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db_app_comandas)
):
    """Listar comandas abiertas"""
    service = ComandaService(db)
    comandas = service.listar_comandas_abiertas(skip, limit)

    data = [
        {
            "id": c.id,
            "numero": c.numero,
            "mesa_id": c.mesa_id,
            "mesa_numero": c.mesa.numero if c.mesa else None,
            "estado": c.estado,
            "total": str(c.total or 0),
            "subtotal": str(c.subtotal or 0),
            "impuesto": str(c.impuesto or 0),
            "usuario_mesero_id": c.usuario_mesero_id,
            "usuario_nombre": (
                c.usuario_mesero.nombre_usuario
                if c.usuario_mesero and c.usuario_mesero.nombre_usuario
                else (
                    f"{c.usuario_mesero.nombre} {c.usuario_mesero.apellido or ''}".strip()
                    if c.usuario_mesero
                    else "Sistema"
                )
            ),
            "cliente_nombre": (
                f"{c.cliente.nombre} {c.cliente.apellido or ''}".strip()
                if c.cliente and c.cliente.nombre
                else None
            ),
            "tipo_cliente": c.tipo_cliente,
            "fecha_creacion": c.fecha_creacion.isoformat() if c.fecha_creacion else None,
            "fecha_actualizacion": c.fecha_cierre.isoformat() if c.fecha_cierre else None
        }
        for c in comandas
    ]

    return PaginatedResponse(
        success=True,
        code=200,
        message="Comandas obtenidas exitosamente",
        total=len(comandas),
        pagina=skip // limit + 1 if limit > 0 else 1,
        limite=limit,
        total_paginas=(len(comandas) + limit - 1) // limit if limit > 0 else 1,
        data=data
    )


@comanda_router.post(
    "/{comanda_id}/items",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Agregar item a comanda",
    description="Agrega un producto a una comanda"
)
async def agregar_item_comanda(
    comanda_id: int,
    data: DetalleComandaCreate,
    request: Request,
    db: Session = Depends(get_db_app_comandas)
):
    """Agregar item a una comanda"""
    service = ComandaService(db)
    comanda = service.obtener_comanda(comanda_id)

    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    detalle = service.agregar_item_comanda(comanda_id, data)
    if not detalle:
        raise HTTPException(status_code=400, detail="Error al agregar item")

    service.calcular_totales(comanda_id)

    try:
        comanda = service.obtener_comanda(comanda_id)
        payload = {
            "type": "nuevo_item",
            "comanda_id": comanda.id,
            "detalle_id": detalle.id,
            "mesa": getattr(comanda, "mesa_id", None),
            "title": f"Nuevo item en pedido #{comanda.numero}",
            "desc": f"Mesa {getattr(comanda, 'mesa_id', '?')} · {detalle.cantidad} producto(s)",
        }
        await notifications_manager.broadcast("cocina", {"topic": "cocina", "payload": payload})
    except Exception as e:
        print(f"Error al notificar a cocina: {e}")

    # Registrar auditoría del item agregado
    try:
        usuario_id = None
        nombre_usuario = None
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=[os.getenv('ALGORITHM', 'HS256')])
                usuario_id = payload.get('user_id') or payload.get('user_id')
                nombre_usuario = payload.get('sub') or payload.get('username')
            except Exception:
                usuario_id = None
                nombre_usuario = None
        ip = request.client.host if request.client else None
        ua = request.headers.get('user-agent')
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=nombre_usuario, accion="AGREGAR_ITEM_COMANDA", modulo="comanda", tabla_afectada="detalle_comanda", registro_id=detalle.id, datos_antes=None, datos_despues={"comanda_id": comanda_id, "detalle_id": detalle.id, "producto_id": detalle.producto_id, "cantidad": detalle.cantidad}, ip_usuario=ip, navegador=ua)
    except Exception:
        pass

    return GenericResponse(
        success=True,
        code=201,
        message="Item agregado exitosamente",
        data={"detalle_id": detalle.id}
    )


@comanda_router.post(
    "/{comanda_id}/cerrar",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Cerrar comanda",
    description="Cierra una comanda y marca como pagada"
)
def cerrar_comanda(
    comanda_id: int,
    request: Request,
    db: Session = Depends(get_db_app_comandas)
):
    """Cerrar una comanda"""
    service = ComandaService(db)
    resultado = service.cerrar_comanda(comanda_id)

    if not resultado:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    # Registrar auditoría de cierre de comanda (checkout)
    try:
        usuario_id = None
        nombre_usuario = None
        auth_header = request.headers.get('authorization') or request.headers.get('Authorization')
        if auth_header and auth_header.lower().startswith('bearer '):
            token = auth_header.split(' ', 1)[1].strip()
            try:
                payload = jwt.decode(token, os.getenv('SECRET_KEY', ''), algorithms=[os.getenv('ALGORITHM', 'HS256')])
                usuario_id = payload.get('user_id') or payload.get('user_id')
                nombre_usuario = payload.get('sub') or payload.get('username')
            except Exception:
                usuario_id = None
                nombre_usuario = None
        ip = request.client.host if request.client else None
        ua = request.headers.get('user-agent')
        log_auditoria(db=db, usuario_id=usuario_id, nombre_usuario=nombre_usuario, accion="CERRAR_COMANDA", modulo="comanda", tabla_afectada="comanda", registro_id=comanda_id, datos_antes=None, datos_despues={"comanda_id": comanda_id}, ip_usuario=ip, navegador=ua)
    except Exception:
        pass

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda cerrada exitosamente"
    )


@comanda_router.post(
    "/{comanda_id}/reabrir",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Reabrir comanda",
    description="Reabre una comanda cerrada para seguir agregando items"
)
def reabrir_comanda(
    comanda_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Reabrir una comanda cerrada"""
    service = ComandaService(db)
    resultado = service.reabrir_comanda(comanda_id)

    if not resultado:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda reabierta exitosamente"
    )


@comanda_router.get(
    "/mesa/{mesa_id}",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Obtener comanda de mesa",
    description="Obtiene la comanda abierta en una mesa específica"
)
def obtener_comanda_mesa(
    mesa_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener comanda abierta en una mesa"""
    service = ComandaService(db)
    comanda = service.obtener_comanda_mesa(mesa_id)

    if not comanda:
        return GenericResponse(
            success=False,
            code=404,
            message="No hay comanda abierta en esta mesa",
            data=None
        )

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda obtenida",
        data={
            "id": comanda.id,
            "numero": comanda.numero,
            "estado": comanda.estado
        }
    )


@comanda_router.get(
    "/{id}",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Obtener comanda",
    description="Obtiene una comanda por su ID"
)
def obtener_comanda(
    id: int,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener una comanda por ID"""
    service = ComandaService(db)
    comanda = service.obtener_comanda(id)

    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda obtenida exitosamente",
        data={
            "id": comanda.id,
            "numero": comanda.numero,
            "mesa_id": comanda.mesa_id,
            "cliente_id": comanda.cliente_id,
            "estado": comanda.estado,
            "total": str(comanda.total or 0),
            "items": [
                {
                    "id": d.id,
                    "producto_id": d.producto_id,
                    "producto_nombre": d.producto.nombre if d.producto else f"Producto {d.producto_id}",
                    "cantidad": d.cantidad,
                    "precio_unitario": str(d.precio_unitario or 0),
                    "subtotal": str(d.subtotal or 0),
                    "notas": d.notas,
                    "estado": d.estado,
                    "prioridad": getattr(d, 'prioridad', None) or ("alta" if d.notas and ("urgente" in d.notas.lower() or "asap" in d.notas.lower()) else "media")
                }
                for d in (comanda.detalles or [])
            ]
        }
    )


@comanda_router.get(
    "/numero/{numero}",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Obtener comanda por número",
    description="Obtiene una comanda por su número interno (por ejemplo T-1024 o ver60)"
)
def obtener_comanda_por_numero(
    numero: str,
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener una comanda por número"""
    service = ComandaService(db)
    comanda = service.obtener_comanda_por_numero(numero)

    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda obtenida exitosamente",
        data={
            "id": comanda.id,
            "numero": comanda.numero,
            "mesa_id": comanda.mesa_id,
            "cliente_id": comanda.cliente_id,
            "estado": comanda.estado,
            "total": str(comanda.total or 0),
            "items": [
                {
                    "id": d.id,
                    "producto_id": d.producto_id,
                    "producto_nombre": d.producto.nombre if d.producto else f"Producto {d.producto_id}",
                    "cantidad": d.cantidad,
                    "precio_unitario": str(d.precio_unitario or 0),
                    "subtotal": str(d.subtotal or 0),
                    "notas": d.notas,
                    "estado": d.estado,
                    "prioridad": getattr(d, 'prioridad', None) or ("alta" if d.notas and ("urgente" in d.notas.lower() or "asap" in d.notas.lower()) else "media")
                }
                for d in (comanda.detalles or [])
            ]
        }
    )


@comanda_router.put(
    "/{id}",
    response_model=GenericResponse,
    tags=["comandas"],
    summary="Actualizar comanda",
    description="Actualiza una comanda existente"
)
def actualizar_comanda(
    id: int,
    data: ComandaUpdate,
    db: Session = Depends(get_db_app_comandas)
):
    """Actualizar una comanda"""
    print(f"🔄 PUT /comandas/{id} - Actualizando comanda")
    print(f"   Datos recibidos: {data.dict()}")
    service = ComandaService(db)
    comanda = service.actualizar_comanda(id, data)
    print(f"   Resultado: {comanda}")

    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda actualizada exitosamente",
        data={"id": comanda.id}
    )


@comanda_router.post("/{comanda_id}/items/{detalle_id}/listo", response_model=GenericResponse, tags=["comandas"], summary="Marcar item listo", description="Marca un item como listo (cocina)")
async def marcar_item_listo(
    comanda_id: int,
    detalle_id: int,
    request: Request,
    db: Session = Depends(get_db_app_comandas)
):
    service = ComandaService(db)
    result = service.marcar_item_listo(comanda_id, detalle_id)
    if not result:
        raise HTTPException(status_code=404, detail="Detalle o comanda no encontrada")

    detalle = result.get('detalle')
    comanda = result.get('comanda')

    # Preparar payload de notificación
    payload = {
        "type": "pedido_listo",
        "comanda_id": comanda.id,
        "detalle_id": detalle.id,
        "mesa": getattr(comanda, 'mesa_id', None),
        "title": f"✅ Pedido #{comanda.numero} listo",
        "desc": f"Mesa {getattr(comanda, 'mesa_id', '?')} · Item listo"
    }
    
    # Obtener el mesero asignado a la comanda
    mesero_id = getattr(comanda, 'usuario_mesero_id', None)
    print(f"[DEBUG NOTIF] Marcando listo - comanda_id={comanda_id}, mesero_asignado_id={mesero_id}")
    
    # IMPORTANTE: Solo notificar al mesero asignado, NO a cocina
    if mesero_id:
        topic = f"mesero_{mesero_id}"
        try:
            await notifications_manager.broadcast(topic, {"topic": topic, "payload": payload})
            print(f"[DEBUG NOTIF] ✅ Notificación enviada a MESERO: {topic}")
        except Exception as e:
            print(f"[DEBUG NOTIF] ❌ Error enviando a {topic}: {e}")
    else:
        print(f"[DEBUG NOTIF] ⚠️ No hay usuario_mesero_id asignado a comanda {comanda_id}")

    return GenericResponse(success=True, code=200, message="Item marcado como listo y notificación enviada al mesero")


@comanda_router.post("/{comanda_id}/items/{detalle_id}/proceso", response_model=GenericResponse, tags=["comandas"], summary="Marcar item en proceso", description="Marca un item como en cocina (en proceso)")
async def marcar_item_en_proceso(
    comanda_id: int,
    detalle_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    service = ComandaService(db)
    result = service.marcar_item_en_proceso(comanda_id, detalle_id)
    if not result:
        raise HTTPException(status_code=404, detail="Detalle o comanda no encontrada")

    detalle = result.get('detalle')
    comanda = result.get('comanda')

    # notificar a cocina (tablero de cocina) sobre el detalle en proceso
    try:
        payload = {
            "type": "item_en_proceso",
            "comanda_id": comanda.id,
            "detalle_id": detalle.id,
            "mesa": getattr(comanda, 'mesa_id', None),
            "title": f"Item en proceso - Pedido #{comanda.numero}",
            "desc": f"Mesa {getattr(comanda, 'mesa_id', '?')} · {detalle.cantidad} x {getattr(detalle.producto, 'nombre', 'producto')}"
        }
        await notifications_manager.broadcast("cocina", {"topic": "cocina", "payload": payload})
    except Exception as e:
        print(f"Error al notificar a cocina (proceso): {e}")

    # Verificar stock del producto y notificar si está bajo o agotado
    try:
        from models.producto import Producto
        producto = db.get(Producto, detalle.producto_id)
        if producto:
            stock = int(producto.stock or 0)
            minimo = int(producto.stock_minimo or 0)
            if stock <= 0:
                alert_payload = {
                    "type": "stock_agotado",
                    "producto_id": producto.id,
                    "producto_nombre": producto.nombre,
                    "stock": stock,
                    "mesa": getattr(comanda, 'mesa_id', None),
                    "title": f"Stock agotado: {producto.nombre}",
                    "desc": f"Producto sin stock (comanda #{comanda.numero})"
                }
                await notifications_manager.broadcast("cocina", {"topic": "cocina", "payload": alert_payload})
            elif stock <= minimo:
                alert_payload = {
                    "type": "stock_bajo",
                    "producto_id": producto.id,
                    "producto_nombre": producto.nombre,
                    "stock": stock,
                    "minimo": minimo,
                    "mesa": getattr(comanda, 'mesa_id', None),
                    "title": f"Stock bajo: {producto.nombre}",
                    "desc": f"Stock {stock} <= minimo {minimo}"
                }
                await notifications_manager.broadcast("cocina", {"topic": "cocina", "payload": alert_payload})
    except Exception as e:
        print(f"Error al verificar/notificar stock: {e}")

    return GenericResponse(success=True, code=200, message="Item marcado en proceso y notificación enviada")


@comanda_router.post(
    "/{comanda_id}/estado/proceso",
    response_model=GenericResponse,
    tags=["cocina"],
    summary="Marcar comanda en proceso",
    description="Marca todos los detalles de una comanda como en cocina"
)
def marcar_comanda_en_proceso(
    comanda_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    service = ComandaService(db)
    result = service.marcar_comanda_en_proceso(comanda_id)
    if not result:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda marcada en proceso",
        data={"comanda_id": comanda_id}
    )


@comanda_router.post(
    "/{comanda_id}/estado/listo",
    response_model=GenericResponse,
    tags=["cocina"],
    summary="Marcar comanda lista",
    description="Marca todos los detalles de una comanda como listos y notifica al mesero"
)
async def marcar_comanda_lista(
    comanda_id: int,
    db: Session = Depends(get_db_app_comandas)
):
    service = ComandaService(db)
    result = service.marcar_comanda_lista(comanda_id)
    if not result:
        raise HTTPException(status_code=404, detail="Comanda no encontrada")

    comanda = result.get('comanda')
    mesero_id = getattr(comanda, 'usuario_mesero_id', None)
    if mesero_id:
        topic = f"mesero_{mesero_id}"
        payload = {
            "type": "pedido_listo",
            "comanda_id": comanda.id,
            "mesa": getattr(comanda, 'mesa_id', None),
            "title": f"Pedido #{comanda.numero} listo",
            "desc": f"Mesa {getattr(comanda, 'mesa_id', '?')} · Pedido completo listo"
        }
        try:
            await notifications_manager.broadcast(topic, {"topic": topic, "payload": payload})
            print(f"[DEBUG NOTIF] Broadcast comanda lista enviado a {topic} comanda={comanda.id}")
        except Exception as e:
            print(f"Error al publicar notificación: {e}")
        # fallback broadcasts
        try:
            await notifications_manager.broadcast("mesero", {"topic": "mesero", "payload": payload})
            await notifications_manager.broadcast("mesero_1", {"topic": "mesero_1", "payload": payload})
            print(f"[DEBUG NOTIF] Broadcast fallback a mesero y mesero_1 para comanda {comanda.id}")
        except Exception as e:
            print(f"Error al publicar fallback notificación: {e}")
        except Exception as e:
            print(f"Error al publicar notificación: {e}")

    return GenericResponse(
        success=True,
        code=200,
        message="Comanda marcada como lista y notificación enviada",
        data={"comanda_id": comanda_id}
    )


@comanda_router.get(
    "/cocina/ordenes",
    response_model=GenericResponse,
    tags=["cocina"],
    summary="Obtener órdenes de cocina",
    description="Obtiene todas las órdenes para el tablero de cocina agrupadas por estado"
)
def obtener_ordenes_cocina(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener órdenes de cocina por estado"""
    from models.detalle_comanda import DetalleComanda
    from collections import defaultdict
    
    try:
        # Obtener detalles con sus comandas relacionadas (todas activas)
        query = db.query(DetalleComanda, Comanda).join(
            Comanda, DetalleComanda.comanda_id == Comanda.id
        ).filter(
            DetalleComanda.estado.in_(['pedido', 'cocina', 'listo']),
            Comanda.estado.notin_(['pagada', 'cancelada'])
        ).all()

        # Agrupar por comanda para referencia
        ordenes_por_comanda = defaultdict(lambda: {
            "comanda_id": None,
            "comanda_numero": None,
            "mesa": None,
            "mesa_estado": "disponible",
            "fecha_creacion": None,
            "prioridad": "media",
            "items_por_estado": {
                "pedido": [],
                "cocina": [],
                "listo": [],
            }
        })

        for detalle, comanda in query:
            mesa_numero = comanda.mesa.numero if comanda.mesa else None
            mesa_nombre = f"Mesa {mesa_numero}" if mesa_numero else (
                "Para llevar" if comanda.tipo_cliente == "para_llevar" else "Delivery"
            )
            mesa_estado = comanda.mesa.estado if comanda.mesa else "disponible"

            key = comanda.id
            grupo = ordenes_por_comanda[key]
            grupo["comanda_id"] = comanda.id
            grupo["comanda_numero"] = comanda.numero
            grupo["mesa"] = mesa_nombre
            grupo["mesa_estado"] = mesa_estado
            grupo["fecha_creacion"] = comanda.fecha_creacion.isoformat() if comanda.fecha_creacion else None
            
            item_data = {
                "id": detalle.id,
                "comanda_id": comanda.id,
                "comanda_numero": comanda.numero,
                "mesa": mesa_nombre,
                "producto_nombre": detalle.producto.nombre if detalle.producto else "Producto desconocido",
                "cantidad": detalle.cantidad,
                "notas": detalle.notas,
                "estado": detalle.estado,
                "fecha_creacion": detalle.fecha_creacion.isoformat() if detalle.fecha_creacion else None,
                "prioridad": "alta" if detalle.notas and ("urgente" in detalle.notas.lower() or "asap" in detalle.notas.lower()) else "media"
            }

            detalle_estado = str(detalle.estado or "").lower()
            if detalle_estado in ["pedido", "cocina", "listo"]:
                grupo["items_por_estado"][detalle_estado].append(item_data)
                
            if grupo["prioridad"] != "alta" and detalle.notas and ("urgente" in detalle.notas.lower() or "asap" in detalle.notas.lower()):
                grupo["prioridad"] = "alta"

        # Distribuir items por estado
        ordenes_por_estado = {
            'pedido': [],
            'cocina': [],
            'listo': []
        }

        for grupo in ordenes_por_comanda.values():
            for estado in ['pedido', 'cocina', 'listo']:
                items_en_estado = grupo["items_por_estado"][estado]
                if items_en_estado:
                    order_item = {
                        "id": grupo["comanda_id"],
                        "comanda_id": grupo["comanda_id"],
                        "comanda_numero": grupo["comanda_numero"],
                        "mesa": grupo["mesa"],
                        "mesa_estado": grupo["mesa_estado"],
                        "producto_nombre": ", ".join(sorted({item["producto_nombre"] for item in items_en_estado})),
                        "cantidad": sum(item["cantidad"] for item in items_en_estado),
                        "notas": ", ".join(sorted({item["notas"] for item in items_en_estado if item["notas"]})),
                        "estado": estado,
                        "fecha_creacion": grupo["fecha_creacion"],
                        "prioridad": grupo["prioridad"],
                        "items": items_en_estado,
                    }
                    ordenes_por_estado[estado].append(order_item)


        return GenericResponse(
            success=True,
            code=200,
            message="Órdenes de cocina obtenidas",
            data={
                "pendiente": ordenes_por_estado['pedido'],
                "proceso": ordenes_por_estado['cocina'],
                "listo": ordenes_por_estado['listo']
            }
        )
    except Exception as e:
        print(f"Error al obtener órdenes de cocina: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@comanda_router.get(
    "/cocina/historial",
    response_model=GenericResponse,
    tags=["cocina"],
    summary="Obtener historial de cocina",
    description="Obtiene el historial de órdenes completadas de hoy"
)
def obtener_historial_cocina(
    db: Session = Depends(get_db_app_comandas)
):
    """Obtener historial de órdenes completadas"""
    from models.detalle_comanda import DetalleComanda
    from datetime import datetime, timedelta
    
    try:
        # Obtener inicio y fin del día
        now_utc = datetime.utcnow()
        start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Obtener detalles completados de hoy (filtrando por la fecha de cambio de estado cuando esté disponible)
        # Usamos fecha_estado si existe, de lo contrario fallback a fecha_creacion
        # Construimos la query base y luego filtramos en Python para manejar el fallback
        query = db.query(
            DetalleComanda,
            Comanda
        ).join(
            Comanda, DetalleComanda.comanda_id == Comanda.id
        ).filter(
            DetalleComanda.estado.in_(['listo', 'entregado'])
        ).order_by(
            DetalleComanda.fecha_creacion.desc()
        ).all()

        historial = []
        for detalle, comanda in query:
            mesa_numero = comanda.mesa.numero if comanda.mesa else None
            mesa_nombre = f"Mesa {mesa_numero}" if mesa_numero else (
                "Para llevar" if comanda.tipo_cliente == "para_llevar" else "Delivery"
            )

            # Determinar la hora de completado: preferir fecha_estado, sino fecha_creacion
            fecha_val = detalle.fecha_estado or detalle.fecha_creacion
            if fecha_val:
                try:
                    if getattr(fecha_val, 'tzinfo', None) is None:
                        fecha_iso = fecha_val.isoformat() + "Z"
                    else:
                        fecha_iso = fecha_val.isoformat()
                except Exception:
                    fecha_iso = None
            else:
                fecha_iso = None

            item = {
                "id": detalle.id,
                "comanda_numero": comanda.numero,
                "mesa": mesa_nombre,
                "producto_nombre": detalle.producto.nombre if detalle.producto else "Producto desconocido",
                "cantidad": detalle.cantidad,
                "notas": detalle.notas,
                "estado": detalle.estado,
                "fecha_creacion": fecha_iso,
                "tiempo_cocina": "N/A"  # Se podría calcular si guardamos timestamp de cambio de estado
            }
            historial.append(item)

        return GenericResponse(
            success=True,
            code=200,
            message="Historial de cocina obtenido",
            data=historial
        )
    except Exception as e:
        print(f"Error al obtener historial de cocina: {e}")
        raise HTTPException(status_code=500, detail=str(e))
