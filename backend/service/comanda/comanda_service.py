from sqlalchemy.orm import Session
from repository.comanda.comanda_repository import ComandaRepository
from repository.mesa.mesa_repository import MesaRepository
from repository.producto.producto_repository import ProductoRepository
from schemas.operaciones_schemas import ComandaCreate, ComandaUpdate, DetalleComandaCreate
from decimal import Decimal
import uuid


class ComandaService:
    """Servicio de lógica de negocio para Comandas"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repo = ComandaRepository(db)
        self.mesa_repo = MesaRepository(db)
        self.producto_repo = ProductoRepository(db)
    
    def crear_comanda(self, data: ComandaCreate):
        """Crear una nueva comanda"""
        try:
            print(f"[DEBUG] ComandaCreate recibido: {data}")
            obj_dict = data.dict()
            print(f"[DEBUG] obj_dict convertido: {obj_dict}")

            mesa_id = obj_dict.get('mesa_id')
            print(f"[DEBUG] mesa_id extraído: {mesa_id}")
            
            if mesa_id is not None:
                mesa = self.mesa_repo.get_by_id(mesa_id)
                print(f"[DEBUG] Mesa consultada: {mesa}")
                if not mesa:
                    print(f"[DEBUG] Error: Mesa no existe")
                    return None
                
                print(f"[DEBUG] Estado mesa: {mesa.estado}")
                
                # Si la mesa está ocupada, buscar comanda abierta existente
                if mesa.estado == 'ocupada':
                    print(f"[DEBUG] Mesa ocupada, buscando comanda abierta existente...")
                    comanda_existente = self.repo.get_por_mesa(mesa_id)
                    if comanda_existente:
                        mesero_id = obj_dict.get('usuario_mesero_id')
                        if (comanda_existente.usuario_mesero_id is None) and (mesero_id is not None):
                            comanda_existente.usuario_mesero_id = mesero_id
                            self.db.commit()
                            self.db.refresh(comanda_existente)
                            print(f"[DEBUG] Mesero asignado a comanda existente: {mesero_id}")
                        print(f"[DEBUG] Comanda existente encontrada: {comanda_existente.id}")
                        return comanda_existente
                    else:
                        print(f"[DEBUG] Error: Mesa ocupada pero sin comanda abierta. Resetear mesa.")
                        self.mesa_repo.cambiar_estado(mesa_id, 'disponible')
                        mesa.estado = 'disponible'

            # Generar un número temporal y luego sustituirlo por un consecutivo corto tipo ver1
            obj_dict['numero'] = f"TMP-{uuid.uuid4().hex[:8].upper()}"
            print(f"[DEBUG] obj_dict antes de create: {obj_dict}")
            comanda = self.repo.create(obj_dict)
            print(f"[DEBUG] Comanda creada: {comanda}")

            if comanda:
                comanda.numero = f"ver{comanda.id}"
                self.db.commit()
                self.db.refresh(comanda)

            if comanda and mesa_id is not None:
                self.mesa_repo.cambiar_estado(mesa_id, 'ocupada')
                print(f"[DEBUG] Mesa marcada como ocupada")

            return comanda
        except Exception as e:
            print(f"[ERROR] Exception en crear_comanda: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def obtener_comanda(self, id: int):
        """Obtener una comanda por ID"""
        return self.repo.get_by_id(id)
    
    def obtener_comanda_por_numero(self, numero: str):
        """Obtener comanda por número"""
        return self.repo.get_by_numero(numero)
    
    def listar_comandas_abiertas(self, skip: int = 0, limit: int = 100):
        """Listar comandas abiertas"""
        return self.repo.get_abiertas(skip, limit)
    
    def agregar_item_comanda(self, comanda_id: int, detalle: DetalleComandaCreate):
        """Agregar item a una comanda"""
        try:
            detalle_dict = detalle.dict()
            detalle_dict['comanda_id'] = comanda_id

            producto = self.producto_repo.get_by_id(detalle_dict['producto_id'])
            if not producto:
                print(f"Error en agregar_item_comanda: producto {detalle_dict['producto_id']} no existe")
                return None

            precio_unitario = Decimal(str(producto.precio))
            cantidad = Decimal(str(detalle_dict['cantidad']))
            detalle_dict['precio_unitario'] = precio_unitario
            detalle_dict['subtotal'] = precio_unitario * cantidad
            # Determinar prioridad: si viene en el payload usarla, si no derivar desde notas
            prioridad = detalle_dict.get('prioridad')
            notas = detalle_dict.get('notas') or ""
            if not prioridad:
                prioridad = 'alta' if (notas and ("urgente" in notas.lower() or "asap" in notas.lower())) else 'media'
            detalle_dict['prioridad'] = prioridad

            return self.repo.agregar_detalle(comanda_id, detalle_dict)
        except Exception as e:
            print(f"Error en agregar_item_comanda: {e}")
            return None
    
    def actualizar_comanda(self, id: int, data: ComandaUpdate):
        """Actualizar una comanda"""
        try:
            obj_dict = {k: v for k, v in data.dict().items() if v is not None}
            return self.repo.update(id, obj_dict)
        except Exception as e:
            print(f"Error en actualizar_comanda: {e}")
            return None
    
    def calcular_totales(self, comanda_id: int):
        """Calcular totales de una comanda"""
        return self.repo.calcular_total(comanda_id)
    
    def cerrar_comanda(self, comanda_id: int):
        """Cerrar una comanda"""
        resultado = self.repo.cerrar_comanda(comanda_id)
        if not resultado:
            return False

        comanda = self.repo.get_by_id(comanda_id)
        if comanda and comanda.mesa_id is not None:
            self.mesa_repo.cambiar_estado(comanda.mesa_id, 'disponible')

        return True

    def reabrir_comanda(self, comanda_id: int):
        """Reabrir una comanda cerrada"""
        resultado = self.repo.reabrir_comanda(comanda_id)
        if not resultado:
            return False

        comanda = self.repo.get_by_id(comanda_id)
        if comanda and comanda.mesa_id is not None:
            self.mesa_repo.cambiar_estado(comanda.mesa_id, 'ocupada')

        return True
    
    def obtener_comanda_mesa(self, mesa_id: int):
        """Obtener comanda abierta en una mesa"""
        return self.repo.get_por_mesa(mesa_id)

    def marcar_item_listo(self, comanda_id: int, detalle_id: int):
        """Marca un item de comanda como listo"""
        try:
            detalle = self.repo.actualizar_estado_detalle(detalle_id, 'listo')
            if not detalle:
                return None
            comanda = self.repo.get_by_id(comanda_id)
            return {
                'detalle': detalle,
                'comanda': comanda
            }
        except Exception as e:
            print(f"Error en marcar_item_listo: {e}")
            return None

    def marcar_item_en_proceso(self, comanda_id: int, detalle_id: int):
        """Marca un único detalle de comanda como en cocina (en proceso)"""
        try:
            detalle = self.repo.actualizar_estado_detalle(detalle_id, 'cocina')
            if not detalle:
                return None
            # Actualizar inventario: restar stock del producto asociado al detalle
            try:
                from models.inventario import Inventario
                producto = self.producto_repo.get_by_id(detalle.producto_id)
                cantidad = int(detalle.cantidad or 0)
                if producto is not None and cantidad > 0:
                    cantidad_anterior = int(producto.stock or 0)
                    cantidad_nueva = max(0, cantidad_anterior - cantidad)
                    producto.stock = cantidad_nueva
                    self.db.add(producto)

                    inv = Inventario(
                        producto_id=producto.id,
                        cantidad_anterior=cantidad_anterior,
                        cantidad_nueva=cantidad_nueva,
                        cantidad_cambio=(cantidad_nueva - cantidad_anterior),
                        tipo_movimiento='salida',
                        razon=f"Consumo comanda #{comanda_id} detalle {detalle_id}"
                    )
                    self.db.add(inv)
                    self.db.commit()
                    # refresh detalle and producto
                    self.db.refresh(detalle)
                    self.db.refresh(producto)
            except Exception as ie:
                # No queremos bloquear la operación de marcado si falla el inventario, pero logueamos
                print(f"Error ajustando inventario en marcar_item_en_proceso: {ie}")

            comanda = self.repo.get_by_id(comanda_id)
            return {
                'detalle': detalle,
                'comanda': comanda
            }
        except Exception as e:
            print(f"Error en marcar_item_en_proceso: {e}")
            return None

    def marcar_comanda_en_proceso(self, comanda_id: int):
        """Marca todos los detalles de una comanda como en cocina"""
        try:
            detalles = self.repo.actualizar_estado_detalles_comanda(comanda_id, 'cocina')
            if not detalles:
                return None
            # Intentar decrementar inventario por cada detalle marcado
            try:
                from models.inventario import Inventario
                for detalle in detalles:
                    try:
                        producto = self.producto_repo.get_by_id(detalle.producto_id)
                        cantidad = int(detalle.cantidad or 0)
                        if producto is None or cantidad <= 0:
                            continue
                        cantidad_anterior = int(producto.stock or 0)
                        cantidad_nueva = max(0, cantidad_anterior - cantidad)
                        producto.stock = cantidad_nueva
                        self.db.add(producto)

                        inv = Inventario(
                            producto_id=producto.id,
                            cantidad_anterior=cantidad_anterior,
                            cantidad_nueva=cantidad_nueva,
                            cantidad_cambio=(cantidad_nueva - cantidad_anterior),
                            tipo_movimiento='salida',
                            razon=f"Consumo comanda #{comanda_id} detalle {detalle.id}"
                        )
                        self.db.add(inv)
                    except Exception as inner_e:
                        print(f"Error ajustando inventario para detalle {detalle.id}: {inner_e}")
                # Commit de los cambios de inventario
                try:
                    self.db.commit()
                except Exception:
                    self.db.rollback()
            except Exception as ie:
                print(f"Error en bloque de inventario para marcar_comanda_en_proceso: {ie}")

            comanda = self.repo.get_by_id(comanda_id)
            return {
                'detalles': detalles,
                'comanda': comanda
            }
        except Exception as e:
            print(f"Error en marcar_comanda_en_proceso: {e}")
            return None

    def marcar_comanda_lista(self, comanda_id: int):
        """Marca todos los detalles de una comanda como listos"""
        try:
            detalles = self.repo.actualizar_estado_detalles_comanda(comanda_id, 'listo')
            if not detalles:
                return None
            comanda = self.repo.get_by_id(comanda_id)
            return {
                'detalles': detalles,
                'comanda': comanda
            }
        except Exception as e:
            print(f"Error en marcar_comanda_lista: {e}")
            return None
    
    def obtener_comandas_cliente(self, cliente_id: int, skip: int = 0, limit: int = 100):
        """Obtener comandas de un cliente"""
        return self.repo.get_por_cliente(cliente_id, skip, limit)
