from sqlalchemy import select
from sqlalchemy.orm import Session

from models.categoria import Categoria
from repository.base_repository import BaseRepository


class CategoriaRepository(BaseRepository[Categoria]):
	"""Repositorio para la entidad Categoria"""

	def __init__(self, db: Session):
		super().__init__(db, Categoria)

	def get(self, categoria_id: int) -> Categoria | None:
		"""Obtener una categoría por ID."""
		return self.get_by_id(categoria_id)

	def get_by_nombre(self, nombre: str) -> Categoria | None:
		"""Obtener una categoría por nombre."""
		try:
			stmt = select(Categoria).where(Categoria.nombre == nombre)
			return self.db.execute(stmt).scalars().first()
		except Exception as e:
			print(f"Error en get_by_nombre: {e}")
			return None

	def get_activas(self, skip: int = 0, limit: int = 100) -> list[Categoria]:
		"""Obtener solo las categorías activas."""
		try:
			stmt = select(Categoria).where(Categoria.activo == 1).offset(skip).limit(limit)
			return self.db.execute(stmt).scalars().all()
		except Exception as e:
			print(f"Error en get_activas: {e}")
			return []

	def get_activos(self, skip: int = 0, limit: int = 100) -> list[Categoria]:
		"""Alias de compatibilidad para repositorios que usan get_activos."""
		return self.get_activas(skip=skip, limit=limit)