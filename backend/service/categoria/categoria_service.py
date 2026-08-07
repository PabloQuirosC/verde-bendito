from sqlalchemy.orm import Session
from models.categoria import Categoria
from repository.categoria.categoria_repository import CategoriaRepository
from schemas.operaciones_schemas import CategoriaCreate, CategoriaUpdate
from models.producto import Producto


class CategoriaService:
    def __init__(self, db: Session):
        self.db = db
        self.repository = CategoriaRepository(db)

    def crear_categoria(self, data: CategoriaCreate) -> Categoria:
        """Crea una nueva categoría"""
        categoria = Categoria(
            nombre=data.nombre,
            emoji=data.emoji,
            activo=1
        )
        self.db.add(categoria)
        self.db.commit()
        self.db.refresh(categoria)
        return categoria

    def obtener_categoria(self, categoria_id: int) -> Categoria | None:
        """Obtiene una categoría por ID"""
        return self.repository.get(categoria_id)

    def listar_categorias(self, skip: int = 0, limit: int = 100):
        """Lista todas las categorías"""
        return self.repository.get_all(skip=skip, limit=limit)

    def listar_categorias_activas(self, skip: int = 0, limit: int = 100):
        """Lista solo las categorías activas"""
        return self.repository.get_activas(skip=skip, limit=limit)

    def actualizar_categoria(self, categoria_id: int, data: CategoriaUpdate) -> Categoria | None:
        """Actualiza una categoría existente"""
        categoria = self.repository.get(categoria_id)
        if not categoria:
            return None

        if data.nombre is not None:
            categoria.nombre = data.nombre
        if data.emoji is not None:
            categoria.emoji = data.emoji
        if data.activo is not None:
            categoria.activo = 1 if data.activo else 0

        self.db.commit()
        self.db.refresh(categoria)
        return categoria

    def eliminar_categoria(self, categoria_id: int, reassign_to: int | None = None) -> bool:
        """Elimina una categoría. Si `reassign_to` es provisto, reasigna productos antes de eliminar."""
        try:
            # Si se proporciona reassign_to, actualizar productos asociados
            if reassign_to is not None:
                self.db.query(Producto).filter(Producto.categoria_id == categoria_id).update({"categoria_id": reassign_to})
                self.db.commit()

            # Verificar que ya no existan productos asociados
            remaining = self.db.query(Producto).filter(Producto.categoria_id == categoria_id).count()
            if remaining > 0:
                return False

            return self.repository.delete(categoria_id)
        except Exception as e:
            print(f"Error en eliminar_categoria (with reassign): {e}")
            self.db.rollback()
            return False

    def categoria_existe(self, nombre: str) -> bool:
        """Verifica si una categoría con ese nombre ya existe"""
        return self.repository.get_by_nombre(nombre) is not None
