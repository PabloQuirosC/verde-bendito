from sqlalchemy.orm import Session
from repository.mesa.mesa_repository import MesaRepository
from schemas.operaciones_schemas import MesaCreate, MesaUpdate


class MesaService:
    """Servicio de lógica de negocio para Mesas"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = MesaRepository(db)
    
    def crear_mesa(self, data: MesaCreate):
        """Crear una nueva mesa"""
        try:
            obj_dict = data.dict()
            return self.repo.create(obj_dict)
        except Exception as e:
            print(f"Error en crear_mesa: {e}")
            return None
    
    def obtener_mesa(self, id: int):
        """Obtener una mesa por ID"""
        return self.repo.get_by_id(id)
    
    def listar_mesas(self, skip: int = 0, limit: int = 100):
        """Listar todas las mesas"""
        return self.repo.get_all(skip, limit)
    
    def actualizar_mesa(self, id: int, data: MesaUpdate):
        """Actualizar una mesa"""
        try:
            obj_dict = {k: v for k, v in data.dict().items() if v is not None}
            return self.repo.update(id, obj_dict)
        except Exception as e:
            print(f"Error en actualizar_mesa: {e}")
            return None
    
    def eliminar_mesa(self, id: int):
        """Eliminar una mesa"""
        try:
            mesa = self.repo.get_by_id(id)
            if not mesa:
                return None
            
            success = self.repo.delete(id)
            if success:
                return mesa
            return None
        except Exception as e:
            print(f"Error en eliminar_mesa: {e}")
            return None
    
    def obtener_mesas_disponibles(self):
        """Obtener mesas disponibles"""
        return self.repo.get_disponibles()
    
    def obtener_mesas_ocupadas(self):
        """Obtener mesas ocupadas"""
        return self.repo.get_ocupadas()
    
    def cambiar_estado_mesa(self, mesa_id: int, nuevo_estado: str):
        """Cambiar estado de una mesa"""
        return self.repo.cambiar_estado(mesa_id, nuevo_estado)
    
    def obtener_mesa_por_numero(self, numero: int):
        """Obtener mesa por número"""
        return self.repo.get_by_numero(numero)
