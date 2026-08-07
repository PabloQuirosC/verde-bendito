from sqlalchemy.orm import Session
from sqlalchemy import select
from models.producto import Producto
from repository.base_repository import BaseRepository


class ProductoRepository(BaseRepository[Producto]):
    """Repositorio para la entidad Producto"""
    
    def __init__(self, db: Session):
        super().__init__(db, Producto)
    
    def get_by_categoria(self, categoria_id: int, activo: bool = True) -> list:
        """Obtener productos por categoría"""
        try:
            stmt = select(Producto).where(
                (Producto.categoria_id == categoria_id) &
                (Producto.activo == (1 if activo else 0))
            )
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_by_categoria: {e}")
            return []
    
    def get_bajo_stock(self) -> list:
        """Obtener productos con stock bajo"""
        try:
            stmt = select(Producto).where(
                (Producto.stock <= Producto.stock_minimo) &
                (Producto.activo == 1)
            )
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_bajo_stock: {e}")
            return []
    
    def get_activos(self, skip: int = 0, limit: int = 100) -> list:
        """Obtener solo productos activos"""
        try:
            stmt = select(Producto).where(
                Producto.activo == 1
            ).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_activos: {e}")
            return []
    
    def actualizar_stock(self, producto_id: int, cantidad: int) -> bool:
        """Actualizar stock de un producto"""
        try:
            producto = self.get_by_id(producto_id)
            if not producto:
                return False
            
            producto.stock += cantidad
            self.db.commit()
            self.db.refresh(producto)
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en actualizar_stock: {e}")
            return False
