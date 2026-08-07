from fastapi import APIRouter, Depends

# from controller.api import api_router
from routes.auth import auth_router
from routes.usuario import usuario_router
from routes.rol import rol_router
from routes.permiso import permiso_router
from routes.producto import producto_router
from routes.categoria import categoria_router
from routes.proveedor import proveedor_router
from routes.mesa import mesa_router
from routes.comanda import comanda_router
from routes.compra import compra_router
from routes.cliente import cliente_router
from routes.pago import pago_router
from routes.inventario import inventario_router
from routes.notifications import router as notifications_router
from routes.factura import factura_router
from routes.dashboard import dashboard_router
from routes.auditoria import router as auditoria_router
from routes.configuracion import router as configuracion_router
from routes.hardware import router as hardware_router
from utils.utils import validate_token

main_router = APIRouter()

# main_router.include_router(api_router, prefix="", dependencies=[Depends(validate_token)])
main_router.include_router(
    auth_router,
    prefix="/auth",
)
main_router.include_router(
    usuario_router,
    prefix="/usuarios",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    rol_router,
    prefix="/roles",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    permiso_router,
    prefix="/permisos",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    producto_router,
    prefix="/productos",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    categoria_router,
    prefix="/categorias",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    proveedor_router,
    prefix="/proveedores",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    inventario_router,
    prefix="/inventario",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    mesa_router,
    prefix="/mesas",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    comanda_router,
    prefix="/comandas",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    compra_router,
    prefix="/compras",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    notifications_router,
    prefix="/notifications",
)
main_router.include_router(
    cliente_router,
    prefix="/clientes",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    pago_router,
    prefix="/pagos",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    factura_router,
    prefix="/facturas",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    dashboard_router,
    prefix="/dashboard",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    auditoria_router,
    prefix="/auditoria",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    configuracion_router,
    prefix="/configuracion",
    dependencies=[Depends(validate_token)],
)
main_router.include_router(
    hardware_router,
    prefix="/hardware",
    dependencies=[Depends(validate_token)],
)

