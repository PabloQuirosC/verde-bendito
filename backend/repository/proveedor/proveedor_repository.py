from sqlalchemy.orm import Session
from sqlalchemy import select
from models.proveedor import Proveedor
from repository.base_repository import BaseRepository


class ProveedorRepository(BaseRepository[Proveedor]):
    """Repositorio para la entidad Proveedor"""

    def __init__(self, db: Session):
        super().__init__(db, Proveedor)

    def get_by_nombre(self, nombre: str) -> Proveedor | None:
        try:
            # DEBUG: imprimir columnas mapeadas y SQL generado
            try:
                cols = list(Proveedor.__table__.columns.keys())
            except Exception:
                cols = None
            print(f"DEBUG Proveedor cols: {cols}")
            stmt = select(Proveedor).where(Proveedor.nombre == nombre)
            print(f"DEBUG SQL get_by_nombre: {stmt}")
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_nombre: {e}")
            return None

    def get_activos(self, skip: int = 0, limit: int = 100) -> list[Proveedor]:
        try:
            try:
                cols = list(Proveedor.__table__.columns.keys())
            except Exception:
                cols = None
            print(f"DEBUG Proveedor cols: {cols}")
            stmt = select(Proveedor).where(Proveedor.activo == 1).offset(skip).limit(limit)
            print(f"DEBUG SQL get_activos: {stmt}")
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_activos: {e}")
            return []
