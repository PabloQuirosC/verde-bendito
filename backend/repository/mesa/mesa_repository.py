from sqlalchemy.orm import Session
from sqlalchemy import select
from models.mesa import Mesa
from repository.base_repository import BaseRepository


class MesaRepository(BaseRepository[Mesa]):
    """Repositorio para la entidad Mesa"""
    
    def __init__(self, db: Session):
        super().__init__(db, Mesa)
    
    def get_by_numero(self, numero: int) -> Mesa:
        """Obtener mesa por número"""
        try:
            stmt = select(Mesa).where(Mesa.numero == numero)
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_numero: {e}")
            return None
    
    def get_disponibles(self) -> list:
        """Obtener mesas disponibles"""
        try:
            stmt = select(Mesa).where(
                (Mesa.estado == 'disponible') &
                (Mesa.activo == 1)
            )
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_disponibles: {e}")
            return []
    
    def get_ocupadas(self) -> list:
        """Obtener mesas ocupadas"""
        try:
            stmt = select(Mesa).where(
                (Mesa.estado == 'ocupada') &
                (Mesa.activo == 1)
            )
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_ocupadas: {e}")
            return []
    
    def cambiar_estado(self, mesa_id: int, nuevo_estado: str) -> bool:
        """Cambiar estado de una mesa"""
        try:
            mesa = self.get_by_id(mesa_id)
            if not mesa:
                return False
            
            mesa.estado = nuevo_estado
            self.db.commit()
            self.db.refresh(mesa)
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en cambiar_estado: {e}")
            return False
