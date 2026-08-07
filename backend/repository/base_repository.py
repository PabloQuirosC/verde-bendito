from sqlalchemy.orm import Session, load_only
from sqlalchemy import select, desc, asc, inspect as sa_inspect
from typing import List, Optional, Type, TypeVar, Generic

T = TypeVar('T')


class BaseRepository(Generic[T]):
    """Clase base para repositorios CRUD genéricos"""
    
    def __init__(self, db: Session, model_class: Type[T]):
        self.db = db
        self.model_class = model_class
    
    def get_by_id(self, id: int) -> Optional[T]:
        """Obtener un registro por ID"""
        try:
            # Intentar seleccionar solo las columnas existentes en la tabla para evitar errores
            existing_cols = set()
            try:
                engine = getattr(self.db, 'bind', None) or self.db.get_bind()
                if engine is not None:
                    insp = sa_inspect(engine)
                    existing_cols = {c['name'] for c in insp.get_columns(self.model_class.__tablename__)}
            except Exception:
                existing_cols = set()

            if existing_cols:
                # Traducir nombres de columna a atributos ORM para load_only
                attrs = [getattr(self.model_class, c) for c in existing_cols if hasattr(self.model_class, c)]
                if attrs:
                    stmt = select(self.model_class).options(load_only(*attrs)).where(self.model_class.id == id)
                else:
                    stmt = select(self.model_class).where(self.model_class.id == id)
            else:
                stmt = select(self.model_class).where(self.model_class.id == id)

            return self.db.execute(stmt).scalars().first()
        except Exception as e:
            print(f"Error en get_by_id: {e}")
            return None
    
    def get_all(self, skip: int = 0, limit: int = 100, order_by: str = None, order_dir: str = "asc") -> List[T]:
        """Obtener todos los registros con paginación"""
        try:
            # Seleccionar solo columnas existentes en la BD para evitar errores cuando el modelo tenga campos no migrados
            existing_cols = set()
            try:
                engine = getattr(self.db, 'bind', None) or self.db.get_bind()
                if engine is not None:
                    insp = sa_inspect(engine)
                    existing_cols = {c['name'] for c in insp.get_columns(self.model_class.__tablename__)}
            except Exception:
                existing_cols = set()

            if existing_cols:
                # Traducir nombres de columna a atributos ORM para load_only
                attrs = [getattr(self.model_class, c) for c in existing_cols if hasattr(self.model_class, c)]
                if attrs:
                    stmt = select(self.model_class).options(load_only(*attrs))
                else:
                    stmt = select(self.model_class)
            else:
                stmt = select(self.model_class)

            if order_by and hasattr(self.model_class, order_by) and (not existing_cols or order_by in existing_cols):
                column = getattr(self.model_class, order_by)
                stmt = stmt.order_by(desc(column) if order_dir == "desc" else asc(column))

            stmt = stmt.offset(skip).limit(limit)
            return self.db.execute(stmt).scalars().all()
        except Exception as e:
            print(f"Error en get_all: {e}")
            return []
    
    def create(self, obj: dict) -> Optional[T]:
        """Crear un nuevo registro"""
        try:
            # Filtrar solo las claves que corresponden a columnas mapeadas
            if hasattr(self.model_class, "__table__"):
                cols = set(self.model_class.__table__.columns.keys())
                # Intentar obtener las columnas reales existentes en la BD para evitar errores
                existing_cols = set()
                try:
                    engine = getattr(self.db, 'bind', None) or self.db.get_bind()
                    if engine is not None:
                        insp = sa_inspect(engine)
                        existing_cols = {c['name'] for c in insp.get_columns(self.model_class.__tablename__)}
                except Exception:
                    existing_cols = set()

                if existing_cols:
                    filtered = {k: v for k, v in obj.items() if k in cols and k in existing_cols}
                else:
                    filtered = {k: v for k, v in obj.items() if k in cols}
            else:
                filtered = obj

            db_obj = self.model_class(**filtered)
            self.db.add(db_obj)
            self.db.commit()
            self.db.refresh(db_obj)
            return db_obj
        except Exception as e:
            self.db.rollback()
            print(f"Error en create: {e}")
            return None
    
    def update(self, id: int, obj: dict) -> Optional[T]:
        """Actualizar un registro existente"""
        try:
            print(f"[UPDATE] Actualizando {self.model_class.__name__} ID={id} con datos: {obj}")
            db_obj = self.get_by_id(id)
            if not db_obj:
                print(f"[UPDATE] Objeto no encontrado: {self.model_class.__name__} ID={id}")
                return None
            # Filtrar solo claves mapeadas y aplicar
            if hasattr(self.model_class, "__table__"):
                cols = set(self.model_class.__table__.columns.keys())
                existing_cols = set()
                try:
                    engine = getattr(self.db, 'bind', None) or self.db.get_bind()
                    if engine is not None:
                        insp = sa_inspect(engine)
                        existing_cols = {c['name'] for c in insp.get_columns(self.model_class.__tablename__)}
                except Exception:
                    existing_cols = set()
            else:
                cols = None
                existing_cols = set()

            for key, value in obj.items():
                if value is None:
                    print(f"[UPDATE] Saltando {key} porque es None")
                    continue
                if cols is not None:
                    if existing_cols:
                        if key in cols and key in existing_cols:
                            print(f"[UPDATE] Seteando {key}={value}")
                            setattr(db_obj, key, value)
                        else:
                            print(f"[UPDATE] Columna {key} no existe en BD")
                    else:
                        if key in cols:
                            print(f"[UPDATE] Seteando {key}={value}")
                            setattr(db_obj, key, value)
                else:
                    print(f"[UPDATE] Seteando {key}={value}")
                    setattr(db_obj, key, value)
            
            self.db.commit()
            self.db.refresh(db_obj)
            print(f"[UPDATE] ✅ Actualización completada. {key}={getattr(db_obj, key, '?')}")
            return db_obj
        except Exception as e:
            self.db.rollback()
            print(f"[UPDATE] ❌ Error en update: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def delete(self, id: int) -> bool:
        """Eliminar un registro"""
        try:
            db_obj = self.get_by_id(id)
            if not db_obj:
                return False
            
            self.db.delete(db_obj)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            print(f"Error en delete: {e}")
            return False
    
    def count(self) -> int:
        """Contar registros"""
        try:
            stmt = select([self.model_class]).count()
            return self.db.execute(stmt).scalar()
        except Exception as e:
            print(f"Error en count: {e}")
            return 0
