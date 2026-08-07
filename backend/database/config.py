import os
from dotenv import load_dotenv
from .enums import DatabaseType

load_dotenv()


class DatabaseConfig:
    """Configuración individual de cada base de datos"""

    def __init__(self, db_type: DatabaseType):
        prefix = db_type.value.upper()
        self.user = os.getenv(f"MYSQL_USER_{prefix}")
        self.password = os.getenv(f"MYSQL_PASSWORD_{prefix}")
        self.host = os.getenv(f"MYSQL_HOST_{prefix}")
        self.port = os.getenv(f"MYSQL_PORT_{prefix}")
        self.service = os.getenv(f"MYSQL_SERVICE_{prefix}")

    @property
    def url(self) -> str:
        """Construye la URL de conexión a MySQL"""
        return (
            f"mysql+pymysql://{self.user}:{self.password}"
            f"@{self.host}:{self.port}/{self.service}"
        )

    @property
    def connect_args(self) -> dict:
        """Argumentos adicionales para conexión con múltiples hosts"""
        hosts = [h.strip() for h in self.host.split(",")]

        if len(hosts) > 1:
            # Construir connection string para failover (Easy Connect Plus)
            hosts_string = ",".join([f"{host}:{self.port}" for host in hosts])
            return {"host": hosts_string, "service_name": self.service}
        return {}
