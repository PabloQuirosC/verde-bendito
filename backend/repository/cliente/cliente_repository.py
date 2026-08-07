from sqlalchemy.orm import Session
from sqlalchemy import select
from models.cliente import Cliente
from repository.base_repository import BaseRepository


class ClienteRepository(BaseRepository[Cliente]):
    """Repositorio para la entidad Cliente"""
    
    def __init__(self, db: Session):
        super().__init__(db, Cliente)
    
    def get_by_email(self, email: str) -> Cliente:
        """Obtener cliente por email"""
        try:
            stmt = select(Cliente).where(Cliente.email == email)
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_email: {e}")
            return None
    
    def get_by_cedula_ruc(self, cedula_ruc: str) -> Cliente:
        """Obtener cliente por cédula o RUC"""
        try:
            stmt = select(Cliente).where(Cliente.cedula_ruc == cedula_ruc)
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_cedula_ruc: {e}")
            return None
    
    def get_activos(self, skip: int = 0, limit: int = 100) -> list:
        """Obtener clientes activos"""
        try:
            stmt = select(Cliente).where(
                Cliente.activo == 1
            ).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_activos: {e}")
            return []
    
    def buscar_por_nombre(self, nombre: str, skip: int = 0, limit: int = 100) -> list:
        """Buscar clientes por nombre"""
        try:
            stmt = select(Cliente).where(
                Cliente.nombre.ilike(f"%{nombre}%")
            ).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en buscar_por_nombre: {e}")
            return []
    
    def actualizar_saldo_credito(self, cliente_id: int, monto: float) -> bool:
        """Actualizar saldo de crédito de un cliente"""
        try:
            cliente = self.get_by_id(cliente_id)
            if not cliente:
                return False
            
            cliente.saldo_credito = float(cliente.saldo_credito or 0) + monto
            self.db.commit()
            self.db.refresh(cliente)
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en actualizar_saldo_credito: {e}")
            return False
