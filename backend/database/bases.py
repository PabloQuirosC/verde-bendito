from .enums import DatabaseType
from .manager import DatabaseManager

# Bases declarativas para cada BD
BaseAPP_PAS_COMANDAS = DatabaseManager.get_base(DatabaseType.APP_PAS_SISTEMAS)

# Base por defecto para Alembic y uso general
Base = BaseAPP_PAS_COMANDAS
