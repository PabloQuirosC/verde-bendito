from sqlalchemy.orm import Session
from sqlalchemy import select
from models.pago import Pago
from repository.base_repository import BaseRepository


class PagoRepository(BaseRepository[Pago]):
    """Repositorio para la entidad Pago"""
    
    def __init__(self, db: Session):
        super().__init__(db, Pago)
    
    def get_por_comanda(self, comanda_id: int) -> list:
        """Obtener pagos de una comanda"""
        try:
            stmt = select(Pago).where(Pago.comanda_id == comanda_id)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_por_comanda: {e}")
            return []
    
    def get_por_tipo(self, tipo_pago: str, skip: int = 0, limit: int = 100) -> list:
        """Obtener pagos por tipo"""
        try:
            stmt = select(Pago).where(
                Pago.tipo_pago == tipo_pago
            ).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_por_tipo: {e}")
            return []
    
    def monto_total_comanda(self, comanda_id: int) -> float:
        """Obtener monto total pagado en una comanda"""
        try:
            stmt = select(Pago).where(Pago.comanda_id == comanda_id)
            pagos = self.db.execute(stmt).scalars().all()
            return sum(float(p.monto or 0) for p in pagos)
        except Exception as e:
            print(f"Error en monto_total_comanda: {e}")
            return 0.0
