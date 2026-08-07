from dotenv import load_dotenv
import os


class Config:
    # Cargar las variables de entorno desde el archivo .env
    load_dotenv()
    INSTANT_CLIENT_PATH = os.getenv("INSTANT_CLIENT_PATH")
    MYSQL_HOST_APP_COMANDAS = os.getenv("MYSQL_HOST_APP_COMANDAS")
    MYSQL_PORT_APP_COMANDAS = os.getenv("MYSQL_PORT_APP_COMANDAS")
    MYSQL_SERVICE_APP_COMANDAS = os.getenv("MYSQL_SERVICE_APP_COMANDAS")
    MYSQL_USER_APP_COMANDAS = os.getenv("MYSQL_USER_APP_COMANDAS")
    MYSQL_PASSWORD_APP_COMANDAS = os.getenv("MYSQL_PASSWORD_APP_COMANDAS")

config = Config()
