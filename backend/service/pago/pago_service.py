from sqlalchemy.orm import Session
from repository.pago.pago_repository import PagoRepository
from schemas.operaciones_schemas import PagoCreate


class PagoService:
    """Servicio de lógica de negocio para Pagos"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = PagoRepository(db)
    
    def registrar_pago(self, data: PagoCreate, usuario_id: int):
        """Registrar un nuevo pago"""
        try:
            obj_dict = data.dict()
            obj_dict['usuario_id'] = usuario_id
            return self.repo.create(obj_dict)
        except Exception as e:
            print(f"Error en registrar_pago: {e}")
            return None
    
    def obtener_pago(self, id: int):
        """Obtener un pago por ID"""
        return self.repo.get_by_id(id)
    
    def obtener_pagos_comanda(self, comanda_id: int):
        """Obtener pagos de una comanda"""
        return self.repo.get_por_comanda(comanda_id)
    
    def obtener_pagos_por_tipo(self, tipo_pago: str, skip: int = 0, limit: int = 100):
        """Obtener pagos por tipo"""
        return self.repo.get_por_tipo(tipo_pago, skip, limit)
    
    def obtener_total_pagado(self, comanda_id: int):
        """Obtener monto total pagado en una comanda"""
        return self.repo.monto_total_comanda(comanda_id)
    
    def verificar_pago_completo(self, comanda_id: int, total_esperado: float) -> bool:
        """Verificar si una comanda está completamente pagada"""
        total_pagado = self.obtener_total_pagado(comanda_id)
        return total_pagado >= total_esperado
