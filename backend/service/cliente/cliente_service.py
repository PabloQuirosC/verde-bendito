from sqlalchemy.orm import Session
from repository.cliente.cliente_repository import ClienteRepository
from schemas.operaciones_schemas import ClienteCreate, ClienteUpdate


class ClienteService:
    """Servicio de lógica de negocio para Clientes"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = ClienteRepository(db)
    
    def crear_cliente(self, data: ClienteCreate):
        """Crear un nuevo cliente"""
        try:
            obj_dict = data.dict()
            return self.repo.create(obj_dict)
        except Exception as e:
            print(f"Error en crear_cliente: {e}")
            return None
    
    def obtener_cliente(self, id: int):
        """Obtener un cliente por ID"""
        return self.repo.get_by_id(id)
    
    def listar_clientes(self, skip: int = 0, limit: int = 100):
        """Listar clientes activos"""
        return self.repo.get_activos(skip, limit)
    
    def actualizar_cliente(self, id: int, data: ClienteUpdate):
        """Actualizar un cliente"""
        try:
            obj_dict = {k: v for k, v in data.dict().items() if v is not None}
            return self.repo.update(id, obj_dict)
        except Exception as e:
            print(f"Error en actualizar_cliente: {e}")
            return None
    
    def eliminar_cliente(self, id: int):
        """Eliminar un cliente (soft delete)"""
        try:
            return self.repo.update(id, {'activo': 0})
        except Exception as e:
            print(f"Error en eliminar_cliente: {e}")
            return None
    
    def obtener_por_email(self, email: str):
        """Obtener cliente por email"""
        return self.repo.get_by_email(email)
    
    def obtener_por_cedula_ruc(self, cedula_ruc: str):
        """Obtener cliente por cédula o RUC"""
        return self.repo.get_by_cedula_ruc(cedula_ruc)
    
    def buscar_clientes(self, nombre: str, skip: int = 0, limit: int = 100):
        """Buscar clientes por nombre"""
        return self.repo.buscar_por_nombre(nombre, skip, limit)
    
    def actualizar_saldo_credito(self, cliente_id: int, monto: float):
        """Actualizar saldo de crédito"""
        return self.repo.actualizar_saldo_credito(cliente_id, monto)
