from sqlalchemy.orm import Session
from repository.compra.compra_repository import CompraRepository
from repository.proveedor.proveedor_repository import ProveedorRepository
from repository.producto.producto_repository import ProductoRepository
from schemas.operaciones_schemas import CompraCreate, CompraUpdate, DetalleCompraCreate, DetalleCompraUpdate
from decimal import Decimal


class CompraService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CompraRepository(db)
        self.proveedor_repo = ProveedorRepository(db)
        self.producto_repo = ProductoRepository(db)

    def crear_compra(self, data: CompraCreate):
        try:
            obj = data.dict()
            detalles = obj.pop('detalles', []) or []

            # Validar proveedor
            proveedor = self.proveedor_repo.get_by_id(obj.get('proveedor_id'))
            if not proveedor:
                print(f"Proveedor {obj.get('proveedor_id')} no existe")
                return None

            # Calcular subtotal a partir de detalles si vienen
            subtotal = Decimal('0')
            detalles_preparados = []
            for d in detalles:
                dct = d if isinstance(d, dict) else d.dict()
                producto = self.producto_repo.get_by_id(dct.get('producto_id'))
                if producto and (dct.get('precio_unitario') is None):
                    dct['precio_unitario'] = float(producto.precio)
                cantidad = Decimal(str(dct.get('cantidad', 0)))
                precio = Decimal(str(dct.get('precio_unitario', 0)))
                dct['subtotal'] = float(precio * cantidad)
                subtotal += precio * cantidad
                detalles_preparados.append(dct)

            impuesto = float(subtotal * Decimal('0.13'))
            total = float(subtotal + Decimal(str(impuesto)))

            obj['subtotal'] = float(subtotal)
            obj['impuesto'] = impuesto
            obj['total'] = total

            compra = self.repo.create_with_detalles(obj, detalles_preparados)
            return compra
        except Exception as e:
            print(f"Error en crear_compra: {e}")
            return None

    def actualizar_compra(self, compra_id: int, data: CompraUpdate):
        try:
            payload = data.dict(exclude_none=True)
            if not payload:
                return self.repo.get_by_id(compra_id)
            return self.repo.update(compra_id, payload)
        except Exception as e:
            print(f"Error en actualizar_compra: {e}")
            return None

    def actualizar_detalle_compra(self, compra_id: int, detalle_id: int, data: DetalleCompraUpdate):
        try:
            compra = self.repo.get_by_id(compra_id)
            if not compra:
                return None

            detalle = next((item for item in (compra.detalles or []) if item.id == detalle_id), None)
            if not detalle:
                return None

            payload = data.dict(exclude_none=True)
            if not payload:
                return detalle

            for key, value in payload.items():
                setattr(detalle, key, value)

            cantidad = Decimal(str(detalle.cantidad or 0))
            precio_unitario = Decimal(str(detalle.precio_unitario or 0))
            detalle.subtotal = float(cantidad * precio_unitario)

            subtotal = Decimal('0')
            for item in compra.detalles or []:
                item_cantidad = Decimal(str(item.cantidad or 0))
                item_precio = Decimal(str(item.precio_unitario or 0))
                item.subtotal = float(item_cantidad * item_precio)
                subtotal += item_cantidad * item_precio

            compra.subtotal = float(subtotal)
            compra.impuesto = float(subtotal * Decimal('0.13'))
            compra.total = float(subtotal + Decimal(str(compra.impuesto or 0)))

            self.db.commit()
            self.db.refresh(detalle)
            self.db.refresh(compra)
            return detalle
        except Exception as e:
            self.db.rollback()
            print(f"Error en actualizar_detalle_compra: {e}")
            return None

    def eliminar_compra(self, compra_id: int) -> bool:
        try:
            return self.repo.delete(compra_id)
        except Exception as e:
            print(f"Error en eliminar_compra: {e}")
            return False
