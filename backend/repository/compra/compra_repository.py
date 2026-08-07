from sqlalchemy.orm import Session
from sqlalchemy import select
from repository.base_repository import BaseRepository
from models.compra import Compra
from models.detalle_compra import DetalleCompra
from datetime import datetime


class CompraRepository(BaseRepository[Compra]):
    """Repositorio para la entidad Compra"""

    def __init__(self, db: Session):
        super().__init__(db, Compra)

    def create_with_detalles(self, compra_data: dict, detalles: list) -> Compra:
        """Crear compra y sus detalles en una transacción"""
        try:
            # Crear la compra filtrando campos válidos
            compra = self.create(compra_data)
            if not compra:
                return None

            # Crear detalles
            created = []
            for d in detalles or []:
                d['compra_id'] = compra.id
                if 'precio_unitario' in d and 'cantidad' in d:
                    try:
                        d['subtotal'] = d.get('subtotal') or (float(d['precio_unitario']) * int(d['cantidad']))
                    except Exception:
                        d['subtotal'] = d.get('subtotal')
                detalle = DetalleCompra(**{k: v for k, v in d.items() if k in DetalleCompra.__table__.columns.keys()})
                self.db.add(detalle)
                created.append(detalle)

            self.db.commit()
            # refresh compra and detalles
            self.db.refresh(compra)
            for det in created:
                self.db.refresh(det)

            return compra
        except Exception as e:
            self.db.rollback()
            print(f"Error en create_with_detalles: {e}")
            return None
