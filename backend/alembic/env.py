from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, create_engine
from alembic import context
import os, sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from database.bases import Base
from models.usuario import Usuario
from models.rol import Rol
from models.permiso import Permiso
from models.usuario_rol import UsuarioRol
from models.rol_permiso import RolPermiso

config = context.config
target_metadata = Base.metadata

user = os.getenv("MYSQL_USER_APP_PAS_SISTEMAS", "comandas")
password = os.getenv("MYSQL_PASSWORD_APP_PAS_SISTEMAS", "password")
host = os.getenv("MYSQL_HOST_APP_PAS_SISTEMAS", "localhost")
port = os.getenv("MYSQL_PORT_APP_PAS_SISTEMAS", "3306")
database = os.getenv("MYSQL_SERVICE_APP_PAS_SISTEMAS", "comandas")

from urllib.parse import quote_plus
password_encoded = quote_plus(password)
database_url = f"mysql+pymysql://{user}:{password_encoded}@{host}:{port}/{database}"

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

def run_migrations_offline():
    context.configure(url=database_url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    connectable = create_engine(database_url, poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
