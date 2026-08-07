from sqlalchemy.orm import Session
from schemas.operaciones_schemas import InventarioCreate, InventarioResponse
from repository.inventario import InventarioRepository
from models.inventario import Inventario
from models.producto import Producto
from typing import List, Optional


class InventarioService:
    """Servicio de lógica para Inventario"""

    def __init__(self, db: Session):
        self.db = db
        self.repo = InventarioRepository(db)

    def crear_movimiento(self, data: InventarioCreate, usuario_id: Optional[int] = None) -> Optional[Inventario]:
        """Crear un movimiento de inventario"""
        try:
            # Obtener el producto
            producto = self.db.query(Producto).filter(Producto.id == data.producto_id).first()
            if not producto:
                print(f"Producto no encontrado: {data.producto_id}")
                return None

            # Calcular cantidad anterior y nueva
            cantidad_anterior = producto.stock
            cantidad_cambio = data.cantidad_cambio

            # Aplicar movimiento según tipo
            if data.tipo_movimiento == "entrada":
                cantidad_nueva = cantidad_anterior + cantidad_cambio
            elif data.tipo_movimiento in ["salida", "devolucion", "perdida"]:
                cantidad_nueva = max(0, cantidad_anterior - cantidad_cambio)
            elif data.tipo_movimiento == "ajuste":
                cantidad_nueva = cantidad_cambio  # Para ajuste, cantidad_cambio es el nuevo stock
            else:
                cantidad_nueva = cantidad_anterior

            # Actualizar stock del producto
            producto.stock = cantidad_nueva
            self.db.commit()

            # Crear registro de movimiento
            obj_dict = data.dict()
            obj_dict["cantidad_anterior"] = cantidad_anterior
            obj_dict["cantidad_nueva"] = cantidad_nueva
            obj_dict["usuario_id"] = usuario_id

            return self.repo.create(obj_dict)
        except Exception as e:
            print(f"Error en crear_movimiento: {e}")
            self.db.rollback()
            return None

    def obtener_movimiento(self, id: int) -> Optional[Inventario]:
        """Obtener un movimiento por ID"""
        return self.repo.get_by_id(id)

    def listar_movimientos(self, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Listar todos los movimientos"""
        return self.repo.get_all(skip, limit, order_by="fecha_movimiento", order_dir="desc")

    def movimientos_por_producto(self, producto_id: int, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Obtener movimientos de un producto"""
        return self.repo.get_by_producto(producto_id, skip, limit)

    def movimientos_por_tipo(self, tipo_movimiento: str, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Obtener movimientos por tipo"""
        return self.repo.get_by_tipo(tipo_movimiento, skip, limit)

    def ultimos_movimientos(self, limit: int = 20) -> List[Inventario]:
        """Obtener últimos movimientos"""
        return self.repo.get_ultimos_movimientos(skip=0, limit=limit)

    def actualizar_movimiento(self, id: int, data: dict) -> Optional[Inventario]:
        """Actualizar un movimiento (solo campos permitidos)"""
        try:
            movimiento = self.repo.get_by_id(id)
            if not movimiento:
                return None

            # Filtrar campos permitidos para edición
            campos_permitidos = {"razon"}
            update_data = {k: v for k, v in data.items() if k in campos_permitidos and v is not None}

            if not update_data:
                return movimiento

            return self.repo.update(id, update_data)
        except Exception as e:
            print(f"Error en actualizar_movimiento: {e}")
            return None

    def eliminar_movimiento(self, id: int) -> bool:
        """Eliminar un movimiento (solo si es reciente)"""
        try:
            movimiento = self.repo.get_by_id(id)
            if not movimiento:
                return False

            # Revertir cambios de stock
            producto = self.db.query(Producto).filter(Producto.id == movimiento.producto_id).first()
            if producto and movimiento.cantidad_anterior is not None:
                producto.stock = movimiento.cantidad_anterior
                self.db.commit()

            return self.repo.delete(id)
        except Exception as e:
            print(f"Error en eliminar_movimiento: {e}")
            self.db.rollback()
            return False
