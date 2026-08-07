from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from models.inventario import Inventario
from repository.base_repository import BaseRepository
from typing import List, Optional


class InventarioRepository(BaseRepository[Inventario]):
    """Repositorio para la entidad Inventario"""

    def __init__(self, db: Session):
        super().__init__(db, Inventario)

    def get_by_producto(self, producto_id: int, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Obtener movimientos de inventario por producto"""
        try:
            stmt = select(Inventario).where(Inventario.producto_id == producto_id).order_by(desc(Inventario.fecha_movimiento)).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_by_producto: {e}")
            return []

    def get_ultimos_movimientos(self, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Obtener últimos movimientos de inventario"""
        try:
            stmt = select(Inventario).order_by(desc(Inventario.fecha_movimiento)).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_ultimos_movimientos: {e}")
            return []

    def get_by_tipo(self, tipo_movimiento: str, skip: int = 0, limit: int = 100) -> List[Inventario]:
        """Obtener movimientos por tipo"""
        try:
            stmt = select(Inventario).where(Inventario.tipo_movimiento == tipo_movimiento).order_by(desc(Inventario.fecha_movimiento)).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_by_tipo: {e}")
            return []
