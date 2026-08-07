import logging
import sys
import os
from pathlib import Path
from datetime import datetime
from logging.handlers import TimedRotatingFileHandler

def setup_logger():
    """Configura el sistema de logging para la aplicación
    - En local (desarrollo): Consola + Archivo con rotación diaria
    - En Vercel (producción): Solo Consola (filesystem es read-only)
    """
    
    # Crear el logger principal
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Limpiar handlers existentes
    logger.handlers.clear()
    
    # Formato de los logs
    log_format = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    # ✅ Handler para consola (stdout) - Siempre disponible
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(log_format)
    logger.addHandler(console_handler)
    
    # ✅ Handler para archivo con rotación diaria - Solo en desarrollo local
    # En Vercel, el filesystem es read-only, así que saltamos esto
    is_vercel = os.getenv("VERCEL", "").lower() == "true"
    
    if not is_vercel:
        try:
            # Obtener ruta de la carpeta logs
            backend_dir = Path(__file__).parent.parent
            logs_dir = backend_dir / "logs"
            
            # Crear carpeta logs si no existe
            logs_dir.mkdir(exist_ok=True)
            
            # Nombre del archivo con fecha
            fecha_actual = datetime.now().strftime("%Y-%m-%d")
            log_file = logs_dir / f"inmocr{fecha_actual}.log"
            
            # TimedRotatingFileHandler: rota a medianoche cada día
            # when='midnight' = rota a las 00:00 del siguiente día
            # interval=1 = cada 1 día
            # backupCount=30 = mantiene 30 archivos anteriores
            file_handler = TimedRotatingFileHandler(
                log_file,
                when='midnight',
                interval=1,
                backupCount=30,
                encoding='utf-8'
            )
            
            # El formato del suffix para los archivos rotados
            file_handler.suffix = "%Y-%m-%d"
            
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(log_format)
            logger.addHandler(file_handler)
            
            logger.info(f"✅ Logging configurado - Consola + Archivo: {log_file}")
        except Exception as e:
            logger.warning(f"⚠️ No se pudo configurar archivo de logs: {e}")
    else:
        logger.info("✅ Logging configurado para Vercel - Consola únicamente")
    
    return logger