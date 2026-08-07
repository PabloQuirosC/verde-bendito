from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from models.comanda import Comanda
from models.detalle_comanda import DetalleComanda
from repository.base_repository import BaseRepository
from datetime import datetime


class ComandaRepository(BaseRepository[Comanda]):
    """Repositorio para la entidad Comanda"""
    
    def __init__(self, db: Session):
        super().__init__(db, Comanda)
    
    def get_by_numero(self, numero: str) -> Comanda:
        """Obtener comanda por número"""
        try:
            stmt = select(Comanda).where(Comanda.numero == numero)
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_numero: {e}")
            return None
    
    def get_abiertas(self, skip: int = 0, limit: int = 100) -> list:
        """Obtener comandas abiertas"""
        try:
            stmt = select(Comanda).where(
                Comanda.estado == 'abierta'
            ).order_by(desc(Comanda.fecha_creacion)).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_abiertas: {e}")
            return []
    
    def get_por_mesa(self, mesa_id: int) -> Comanda:
        """Obtener comanda abierta en una mesa"""
        try:
            stmt = select(Comanda).where(
                (Comanda.mesa_id == mesa_id) &
                (Comanda.estado == 'abierta')
            )
            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_por_mesa: {e}")
            return None
    
    def get_por_cliente(self, cliente_id: int, skip: int = 0, limit: int = 100) -> list:
        """Obtener comandas de un cliente"""
        try:
            stmt = select(Comanda).where(
                Comanda.cliente_id == cliente_id
            ).order_by(desc(Comanda.fecha_creacion)).offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_por_cliente: {e}")
            return []
    
    def agregar_detalle(self, comanda_id: int, detalle_data: dict) -> DetalleComanda:
        """Agregar item a una comanda"""
        try:
            detalle_data['comanda_id'] = comanda_id
            detalle = DetalleComanda(**detalle_data)
            self.db.add(detalle)
            self.db.commit()
            self.db.refresh(detalle)
            return detalle
        except Exception as e:
            self.db.rollback()
            print(f"Error en agregar_detalle: {e}")
            return None
    
    def calcular_total(self, comanda_id: int) -> dict:
        """Calcular subtotal, impuesto y total de una comanda"""
        try:
            comanda = self.get_by_id(comanda_id)
            if not comanda:
                return None
            
            stmt = select(DetalleComanda).where(DetalleComanda.comanda_id == comanda_id)
            detalles = self.db.execute(stmt).scalars().all()
            
            subtotal = sum(float(d.subtotal or 0) for d in detalles)
            impuesto = subtotal * 0.13  # 13% por defecto
            total = subtotal + impuesto
            
            comanda.subtotal = subtotal
            comanda.impuesto = impuesto
            comanda.total = total
            
            self.db.commit()
            self.db.refresh(comanda)
            
            return {
                'subtotal': subtotal,
                'impuesto': impuesto,
                'total': total
            }
        except Exception as e:
            self.db.rollback()
            print(f"Error en calcular_total: {e}")
            return None
    
    def cerrar_comanda(self, comanda_id: int) -> bool:
        """Cerrar una comanda"""
        try:
            comanda = self.get_by_id(comanda_id)
            if not comanda:
                return False
            
            comanda.estado = 'pagada'
            comanda.fecha_cierre = datetime.utcnow()
            self.db.commit()
            self.db.refresh(comanda)
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en cerrar_comanda: {e}")
            return False

    def reabrir_comanda(self, comanda_id: int) -> bool:
        """Reabrir una comanda cerrada"""
        try:
            comanda = self.get_by_id(comanda_id)
            if not comanda:
                return False

            comanda.estado = 'abierta'
            comanda.fecha_cierre = None
            self.db.commit()
            self.db.refresh(comanda)
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en reabrir_comanda: {e}")
            return False

    def actualizar_estado_detalle(self, detalle_id: int, estado: str):
        """Actualizar el estado de un detalle de comanda"""
        try:
            detalle = self.db.get(DetalleComanda, detalle_id)
            if not detalle:
                return None
            detalle.estado = estado
            try:
                detalle.fecha_estado = datetime.utcnow()
            except Exception:
                pass
            self.db.commit()
            self.db.refresh(detalle)
            return detalle
        except Exception as e:
            self.db.rollback()
            print(f"Error en actualizar_estado_detalle: {e}")
            return None

    def actualizar_estado_detalles_comanda(self, comanda_id: int, estado: str):
        """Actualizar el estado de todos los detalles de una comanda"""
        try:
            detalles = self.db.query(DetalleComanda).filter(DetalleComanda.comanda_id == comanda_id).all()
            if not detalles:
                return []

            for detalle in detalles:
                detalle.estado = estado
                try:
                    detalle.fecha_estado = datetime.utcnow()
                except Exception:
                    pass

            self.db.commit()

            for detalle in detalles:
                self.db.refresh(detalle)

            return detalles
        except Exception as e:
            self.db.rollback()
            print(f"Error en actualizar_estado_detalles_comanda: {e}")
            return []
