from sqlalchemy.orm import Session
from repository.base_repository import BaseRepository
from models.factura import Factura


class FacturaRepository(BaseRepository[Factura]):
    def __init__(self, db: Session):
        super().__init__(db, Factura)

    def create_factura(self, factura_data: dict) -> Factura:
        try:
            # BaseRepository.create filtra campos no mapeados
            factura = self.create(factura_data)
            return factura
        except Exception as e:
            print(f"Error en create_factura: {e}")
            return None
