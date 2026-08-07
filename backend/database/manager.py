"""Gestor centralizado de múltiples bases de datos"""

import os
from typing import Dict
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from .enums import DatabaseType
from .config import DatabaseConfig


class DatabaseManager:
    _engines: Dict[DatabaseType, any] = {}
    _session_makers: Dict[DatabaseType, any] = {}
    _bases: Dict[DatabaseType, any] = {}

    @classmethod
    def get_engine(cls, db_type: DatabaseType):
        """Obtener engine (lazy loading) con configuración para alta disponibilidad"""
        if db_type not in cls._engines:
            config = DatabaseConfig(db_type)
            cls._engines[db_type] = create_engine(
                config.url,
                connect_args=config.connect_args,  # Soporte multi-host
                pool_size=5,
                max_overflow=10,
                pool_pre_ping=True,  # Verifica conexión antes de usar
                pool_recycle=3600,  # Recicla conexiones cada hora
                echo=os.getenv("DB_ECHO", "False").lower() == "true",
            )
        return cls._engines[db_type]

    @classmethod
    def get_session_maker(cls, db_type: DatabaseType):
        """Obtener session maker (lazy loading)"""
        if db_type not in cls._session_makers:
            engine = cls.get_engine(db_type)
            cls._session_makers[db_type] = sessionmaker(
                autocommit=False, autoflush=False, bind=engine
            )
        return cls._session_makers[db_type]

    @classmethod
    def get_base(cls, db_type: DatabaseType):
        """Obtener Base declarativa (lazy loading)"""
        if db_type not in cls._bases:
            cls._bases[db_type] = declarative_base()
        return cls._bases[db_type]

    @classmethod
    def get_session(cls, db_type: DatabaseType) -> Session:
        """Obtener una sesión nueva"""
        SessionLocal = cls.get_session_maker(db_type)
        return SessionLocal()

    @classmethod
    def close_all(cls):
        """Cerrar todas las conexiones (útil para testing)"""
        for engine in cls._engines.values():
            engine.dispose()
        cls._engines.clear()
        cls._session_makers.clear()
