from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database.dependencies import get_db_app_comandas, get_current_user
from service.compra.compra_service import CompraService
from schemas.operaciones_schemas import CompraCreate, CompraUpdate, DetalleCompraUpdate, GenericResponse
from utils.auditoria_utils import log_auditoria

compra_router = APIRouter()


@compra_router.post("/", response_model=GenericResponse, tags=["compras"], summary="Crear compra")
def crear_compra(data: CompraCreate, db: Session = Depends(get_db_app_comandas)):
    service = CompraService(db)
    compra = service.crear_compra(data)
    if not compra:
        raise HTTPException(status_code=400, detail="Error al crear la compra")
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="CREAR_COMPRA", modulo="compra", tabla_afectada="compra", registro_id=compra.id, datos_antes=None, datos_despues={"id": compra.id, "numero": getattr(compra, 'numero', None)})
    except Exception:
        pass
    return GenericResponse(success=True, code=201, message="Compra creada", data={"id": compra.id, "numero": getattr(compra, 'numero', None)})


@compra_router.get("/", response_model=GenericResponse, tags=["compras"], summary="Listar compras")
def listar_compras(skip: int = 0, limit: int = 100, db: Session = Depends(get_db_app_comandas)):
    service = CompraService(db)
    compras = service.repo.get_all(skip=skip, limit=limit, order_by="fecha", order_dir="desc")
    data = [
        {
            "id": compra.id,
            "numero": compra.numero,
            "fecha": compra.fecha,
            "fecha_entrega_esperada": compra.fecha_entrega_esperada,
            "fecha_entrega": compra.fecha_entrega,
            "proveedor_id": compra.proveedor_id,
            "proveedor_nombre": getattr(compra.proveedor, "nombre", None),
            "usuario_id": compra.usuario_id,
            "usuario_nombre": f"{getattr(compra.usuario, 'nombre', '')} {getattr(compra.usuario, 'apellido', '')}".strip() or getattr(compra.usuario, "nombre_usuario", None),
            "subtotal": float(compra.subtotal or 0),
            "impuesto": float(compra.impuesto or 0),
            "total": float(compra.total or 0),
            "estado": compra.estado,
            "detalles_count": len(compra.detalles or []),
        }
        for compra in compras
    ]
    return GenericResponse(success=True, code=200, message="Compras listadas", data=data)


@compra_router.get("/{id}", response_model=GenericResponse, tags=["compras"], summary="Obtener compra")
def obtener_compra(id: int, db: Session = Depends(get_db_app_comandas)):
    service = CompraService(db)
    compra = service.repo.get_by_id(id)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    # Serializar minimal
    data = {
        "id": compra.id,
        "numero": compra.numero,
        "fecha": compra.fecha,
        "fecha_entrega_esperada": compra.fecha_entrega_esperada,
        "fecha_entrega": compra.fecha_entrega,
        "proveedor_id": compra.proveedor_id,
        "proveedor_nombre": getattr(compra.proveedor, "nombre", None),
        "usuario_id": compra.usuario_id,
        "usuario_nombre": f"{getattr(compra.usuario, 'nombre', '')} {getattr(compra.usuario, 'apellido', '')}".strip() or getattr(compra.usuario, "nombre_usuario", None),
        "subtotal": float(compra.subtotal or 0),
        "impuesto": float(compra.impuesto or 0),
        "total": float(compra.total or 0),
        "estado": compra.estado,
        "fecha_entrega_esperada": compra.fecha_entrega_esperada,
        "fecha_entrega": compra.fecha_entrega,
        "descripcion": compra.descripcion,
        "detalles": [
            {
                "id": d.id,
                "producto_id": d.producto_id,
                "producto_nombre": getattr(d.producto, "nombre", None),
                "producto_categoria": getattr(getattr(d.producto, "categoria", None), "nombre", None),
                "producto_stock": getattr(d.producto, "stock", None),
                "cantidad": d.cantidad,
                "precio_unitario": float(d.precio_unitario or 0),
                "subtotal": float(d.subtotal or 0)
            }
            for d in (compra.detalles or [])
        ]
    }
    return GenericResponse(success=True, code=200, message="Compra obtenida", data=data)


@compra_router.put("/{id}", response_model=GenericResponse, tags=["compras"], summary="Actualizar compra")
def actualizar_compra(id: int, data: CompraUpdate, db: Session = Depends(get_db_app_comandas)):
    service = CompraService(db)
    compra = service.actualizar_compra(id, data)
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada o no actualizada")
    try:
        log_auditoria(db=db, usuario_id=None, nombre_usuario=None, accion="ACTUALIZAR_COMPRA", modulo="compra", tabla_afectada="compra", registro_id=compra.id, datos_antes=None, datos_despues={"id": compra.id})
    except Exception:
        pass
    return GenericResponse(success=True, code=200, message="Compra actualizada", data={"id": compra.id, "numero": compra.numero})


@compra_router.put("/{compra_id}/detalles/{detalle_id}", response_model=GenericResponse, tags=["compras"], summary="Actualizar detalle de compra")
def actualizar_detalle_compra(compra_id: int, detalle_id: int, data: DetalleCompraUpdate, db: Session = Depends(get_db_app_comandas)):
    service = CompraService(db)
    detalle = service.actualizar_detalle_compra(compra_id, detalle_id, data)
    if not detalle:
        raise HTTPException(status_code=404, detail="Detalle de compra no encontrado o no actualizado")
    return GenericResponse(
        success=True,
        code=200,
        message="Detalle de compra actualizado",
        data={"id": detalle.id, "compra_id": detalle.compra_id, "cantidad": detalle.cantidad, "subtotal": float(detalle.subtotal or 0)},
    )


@compra_router.delete("/{id}", response_model=GenericResponse, tags=["compras"], summary="Eliminar compra")
def eliminar_compra(
    id: int,
    db: Session = Depends(get_db_app_comandas),
    current_user: dict = Depends(get_current_user),
):
    service = CompraService(db)
    before = service.repo.get_by_id(id)
    before_snapshot = None
    if before:
        before_snapshot = {
            "id": before.id,
            "numero": before.numero,
            "proveedor_id": before.proveedor_id,
            "proveedor_nombre": getattr(before.proveedor, "nombre", None),
            "usuario_id": before.usuario_id,
            "usuario_nombre": f"{getattr(before.usuario, 'nombre', '')} {getattr(before.usuario, 'apellido', '')}".strip() or getattr(before.usuario, "nombre_usuario", None),
            "subtotal": float(before.subtotal or 0),
            "impuesto": float(before.impuesto or 0),
            "total": float(before.total or 0),
            "estado": before.estado,
        }

    ok = service.eliminar_compra(id)
    if not ok:
        raise HTTPException(status_code=404, detail="Compra no encontrada o no eliminada")
    try:
        log_auditoria(
            db=db,
            usuario_id=current_user.get("user_id"),
            nombre_usuario=current_user.get("sub"),
            accion="ELIMINAR_COMPRA",
            modulo="compras",
            tabla_afectada="compra",
            registro_id=id,
            datos_antes=before_snapshot,
            datos_despues={"deleted": True, "compra_id": id},
        )
    except Exception:
        pass
    return GenericResponse(success=True, code=200, message="Compra eliminada", data={"id": id})
