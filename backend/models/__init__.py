# Import all models to ensure relationships are properly registered
from models.usuario import Usuario
from models.rol import Rol
from models.permiso import Permiso
from models.usuario_rol import UsuarioRol
from models.rol_permiso import RolPermiso
from models.configuracion import Configuracion
from models.mesa import Mesa
from models.categoria import Categoria
from models.producto import Producto
from models.proveedor import Proveedor
from models.compra import Compra
from models.detalle_compra import DetalleCompra
from models.inventario import Inventario
from models.cliente import Cliente
from models.comanda import Comanda
from models.detalle_comanda import DetalleComanda
from models.pago import Pago
from models.factura import Factura
from models.auditoria import Auditoria

__all__ = [
    'Usuario',
    'Rol', 
    'Permiso',
    'UsuarioRol',
    'RolPermiso',
    'Configuracion',
    'Mesa',
    'Categoria',
    'Producto',
    'Proveedor',
    'Compra',
    'DetalleCompra',
    'Inventario',
    'Cliente',
    'Comanda',
    'DetalleComanda',
    'Pago',
    'Factura',
    'Auditoria',
]
