from sqlalchemy.orm import Session
from repository.factura.factura_repository import FacturaRepository
from repository.comanda.comanda_repository import ComandaRepository
from schemas.operaciones_schemas import FacturaCreate
from decimal import Decimal


class FacturaService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = FacturaRepository(db)
        self.comanda_repo = ComandaRepository(db)

    def crear_factura(self, data: FacturaCreate):
        try:
            obj = data.dict()
            # Si no viene subtotal/impuesto/total, calcular desde comanda
            if not obj.get('subtotal') or not obj.get('total'):
                comanda = self.comanda_repo.get_by_id(obj.get('comanda_id'))
                if not comanda:
                    print(f"Comanda {obj.get('comanda_id')} no encontrada")
                    return None
                subtotal = Decimal(str(comanda.subtotal or 0))
                impuesto = Decimal(str(comanda.impuesto or subtotal * Decimal('0.13')))
                total = subtotal + impuesto
                obj['subtotal'] = float(subtotal)
                obj['impuesto'] = float(impuesto)
                obj['total'] = float(total)

            factura = self.repo.create_factura(obj)
            return factura
        except Exception as e:
            print(f"Error en crear_factura: {e}")
            return None
