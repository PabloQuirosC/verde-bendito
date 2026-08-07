from fastapi import APIRouter, Depends
from sqlalchemy import func, extract, desc
from datetime import datetime, timedelta
from decimal import Decimal
from database.dependencies import get_db_app_comandas
from models.comanda import Comanda
from models.detalle_comanda import DetalleComanda
from models.producto import Producto
from models.pago import Pago
from models.compra import Compra
from models.detalle_compra import DetalleCompra

dashboard_router = APIRouter()


@dashboard_router.get("/stats")
def get_dashboard_stats(db=Depends(get_db_app_comandas)):
    """Obtiene las estadísticas generales del dashboard"""
    
    # Ventas totales (comandas pagadas en los últimos 30 días)
    today = datetime.utcnow()
    thirty_days_ago = today - timedelta(days=30)
    
    total_ventas = db.query(func.sum(Comanda.total)).filter(
        Comanda.estado == 'pagada',
        Comanda.fecha_cierre >= thirty_days_ago
    ).scalar() or Decimal(0)
    
    # Costo total de compras entregadas
    costo_total = db.query(func.sum(Compra.total)).filter(
        Compra.estado == 'entregada',
        Compra.fecha >= thirty_days_ago
    ).scalar() or Decimal(0)
    
    margen_dinero = total_ventas - costo_total
    margen_porcentaje = ((total_ventas - costo_total) / total_ventas * 100) if total_ventas > 0 else 0
    
    return {
        "ventas_totales": float(total_ventas),
        "margen_dinero": float(margen_dinero),
        "margen_porcentaje": round(float(margen_porcentaje), 2),
        "periodo": "últimos 30 días"
    }


@dashboard_router.get("/ventas-mensuales")
def get_ventas_mensuales(db=Depends(get_db_app_comandas)):
    """Ventas por mes (últimos 12 meses)"""
    
    results = db.query(
        extract('month', Comanda.fecha_cierre).label('month'),
        extract('year', Comanda.fecha_cierre).label('year'),
        func.sum(Comanda.total).label('total')
    ).filter(
        Comanda.estado == 'pagada',
        Comanda.fecha_cierre >= datetime.utcnow() - timedelta(days=365)
    ).group_by('year', 'month').order_by('year', 'month').all()
    
    meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    data = [{'name': meses[int(r[0]) - 1] if r[0] else 'N/A', 'total': float(r[2] or 0)} for r in results]
    
    return data


@dashboard_router.get("/ventas-productos")
def get_ventas_productos(db=Depends(get_db_app_comandas)):
    """Top 7 productos más vendidos"""
    
    results = db.query(
        Producto.nombre,
        func.sum(DetalleComanda.cantidad).label('cantidad'),
        func.sum(DetalleComanda.subtotal).label('total')
    ).join(DetalleComanda, Producto.id == DetalleComanda.producto_id).filter(
        DetalleComanda.estado.in_(['listo', 'entregado'])
    ).group_by(Producto.id, Producto.nombre).order_by(desc('total')).limit(7).all()
    
    data = [{'name': r[0], 'total': float(r[2] or 0)} for r in results]
    return data


@dashboard_router.get("/medios-pago")
def get_medios_pago(db=Depends(get_db_app_comandas)):
    """Distribución de pagos por medio"""
    
    results = db.query(
        Pago.tipo_pago,
        func.count(Pago.id).label('cantidad'),
        func.sum(Pago.monto).label('total')
    ).filter(
        Pago.fecha_pago >= datetime.utcnow() - timedelta(days=30)
    ).group_by(Pago.tipo_pago).all()
    
    data = [{'name': r[0] or 'Desconocido', 'value': float(r[2] or 0)} for r in results]
    return data


@dashboard_router.get("/ventas-diarias")
def get_ventas_diarias(db=Depends(get_db_app_comandas)):
    """Ventas de los últimos 30 días"""
    
    results = db.query(
        func.date(Comanda.fecha_cierre).label('fecha'),
        func.sum(Comanda.total).label('total')
    ).filter(
        Comanda.estado == 'pagada',
        Comanda.fecha_cierre >= datetime.utcnow() - timedelta(days=30)
    ).group_by(func.date(Comanda.fecha_cierre)).order_by('fecha').all()
    
    data = [{'name': f"Día {i+1}", 'total': float(r[1] or 0)} for i, r in enumerate(results)]
    return data


@dashboard_router.get("/canales-venta")
def get_canales_venta(db=Depends(get_db_app_comandas)):
    """Distribución de ventas por canal (local, para_llevar, delivery)"""
    
    results = db.query(
        Comanda.tipo_cliente,
        func.sum(Comanda.total).label('total'),
        func.count(Comanda.id).label('cantidad')
    ).filter(
        Comanda.estado == 'pagada',
        Comanda.fecha_cierre >= datetime.utcnow() - timedelta(days=30)
    ).group_by(Comanda.tipo_cliente).all()
    
    canal_map = {
        'local': 'Local',
        'para_llevar': 'Para llevar',
        'delivery': 'Delivery'
    }
    
    data = [{'name': canal_map.get(r[0], r[0]), 'value': float(r[1] or 0)} for r in results]
    return data
