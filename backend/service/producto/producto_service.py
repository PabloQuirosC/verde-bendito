from sqlalchemy.orm import Session
from repository.producto.producto_repository import ProductoRepository
from schemas.operaciones_schemas import ProductoCreate, ProductoUpdate


class ProductoService:
    """Servicio de lógica de negocio para Productos"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductoRepository(db)
    
    def crear_producto(self, data: ProductoCreate):
        """Crear un nuevo producto"""
        try:
            obj_dict = data.dict()
            return self.repo.create(obj_dict)
        except Exception as e:
            print(f"Error en crear_producto: {e}")
            return None
    
    def obtener_producto(self, id: int):
        """Obtener un producto por ID"""
        return self.repo.get_by_id(id)
    
    def listar_productos(self, skip: int = 0, limit: int = 100):
        """Listar productos activos"""
        return self.repo.get_activos(skip, limit)
    
    def actualizar_producto(self, id: int, data: ProductoUpdate):
        """Actualizar un producto"""
        try:
            obj_dict = {k: v for k, v in data.dict().items() if v is not None}
            return self.repo.update(id, obj_dict)
        except Exception as e:
            print(f"Error en actualizar_producto: {e}")
            return None
    
    def eliminar_producto(self, id: int):
        """Eliminar un producto (soft delete)"""
        try:
            return self.repo.update(id, {'activo': 0})
        except Exception as e:
            print(f"Error en eliminar_producto: {e}")
            return None
    
    def obtener_por_categoria(self, categoria_id: int):
        """Obtener productos de una categoría"""
        return self.repo.get_by_categoria(categoria_id)
    
    def obtener_bajo_stock(self):
        """Obtener productos con stock bajo"""
        return self.repo.get_bajo_stock()
    
    def actualizar_stock(self, producto_id: int, cantidad: int):
        """Actualizar stock de un producto"""
        return self.repo.actualizar_stock(producto_id, cantidad)
