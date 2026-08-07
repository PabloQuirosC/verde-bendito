# -*- coding: utf-8 -*-
"""
Servicio de cifrado para URL tokens dinámicos y variables
Genera tokens únicos con expiración
"""

from cryptography.fernet import Fernet
from datetime import datetime, timedelta
import json
import os
import logging
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)

class EncryptionService:
    """Servicio para cifrar/descifrar tokens de rutas con expiración"""
    
    def __init__(self, encryption_key: Optional[str] = None):
        """
        Inicializa el servicio de cifrado
        
        Args:
            encryption_key: Clave de cifrado (por defecto lee de env ENCRYPTION_KEY)
        """
        self.key = encryption_key or os.getenv('ENCRYPTION_KEY')
        
        if not self.key:
            # Generar una clave por defecto (SOLO PARA DEV)
            logger.warning("⚠️  ENCRYPTION_KEY no configurada, generando clave temporal")
            self.key = Fernet.generate_key().decode()
            logger.warning(f"🔑 Usa esta clave en producción: {self.key}")
        
        # Convertir a bytes si es string
        if isinstance(self.key, str):
            self.key = self.key.encode()
        
        try:
            self.cipher = Fernet(self.key)
        except Exception as e:
            logger.error(f"❌ Error inicializando Fernet: {e}")
            raise ValueError("ENCRYPTION_KEY inválida. Debe ser una clave Fernet válida.")
    
    def generate_route_token(self, route: str, expires_in_minutes: int = 15) -> str:
        """
        Genera un token cifrado para una ruta con expiración
        
        Args:
            route: Ruta a proteger (ej: '/propiedades/123')
            expires_in_minutes: Minutos hasta expiración (default: 15)
            
        Returns:
            Token cifrado en formato base64
        """
        expiry_time = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        
        payload = {
            'route': route,
            'expires': expiry_time.isoformat(),
            'timestamp': datetime.utcnow().isoformat()
        }
        
        json_data = json.dumps(payload)
        encrypted_token = self.cipher.encrypt(json_data.encode())
        
        logger.debug(f"🔐 Token generado para ruta: {route}")
        return encrypted_token.decode()
    
    def verify_and_decrypt_token(self, token: str) -> Tuple[bool, Optional[str], Optional[Dict]]:
        """
        Verifica y desencripta un token
        
        Args:
            token: Token a verificar
            
        Returns:
            Tupla (válido, ruta, payload_completo)
        """
        try:
            decrypted_data = self.cipher.decrypt(token.encode())
            payload = json.loads(decrypted_data.decode())
            
            # Verificar expiración
            expiry_time = datetime.fromisoformat(payload['expires'])
            if datetime.utcnow() > expiry_time:
                logger.warning(f"⏰ Token expirado para ruta: {payload.get('route')}")
                return False, None, payload
            
            logger.debug(f"✅ Token válido para ruta: {payload.get('route')}")
            return True, payload.get('route'), payload
            
        except Exception as e:
            logger.warning(f"❌ Error desencriptando token: {e}")
            return False, None, None
    
    def generate_admin_session_token(self, user_id: str, expires_in_hours: int = 8) -> str:
        """
        Genera un token de sesión admin cifrado
        
        Args:
            user_id: ID del usuario admin
            expires_in_hours: Horas hasta expiración
            
        Returns:
            Token cifrado
        """
        expiry_time = datetime.utcnow() + timedelta(hours=expires_in_hours)
        
        payload = {
            'type': 'admin_session',
            'user_id': user_id,
            'expires': expiry_time.isoformat(),
            'created': datetime.utcnow().isoformat()
        }
        
        json_data = json.dumps(payload)
        encrypted_token = self.cipher.encrypt(json_data.encode())
        
        logger.info(f"🔐 Session token generado para admin: {user_id}")
        return encrypted_token.decode()
    
    def verify_admin_session_token(self, token: str) -> Tuple[bool, Optional[str]]:
        """
        Verifica un token de sesión admin
        
        Returns:
            Tupla (válido, user_id)
        """
        try:
            decrypted_data = self.cipher.decrypt(token.encode())
            payload = json.loads(decrypted_data.decode())
            
            if payload.get('type') != 'admin_session':
                logger.warning("❌ Token no es de tipo admin_session")
                return False, None
            
            # Verificar expiración
            expiry_time = datetime.fromisoformat(payload['expires'])
            if datetime.utcnow() > expiry_time:
                logger.warning(f"⏰ Admin session token expirado")
                return False, None
            
            return True, payload.get('user_id')
            
        except Exception as e:
            logger.warning(f"❌ Error verificando admin session: {e}")
            return False, None


# Instancia global
_encryption_service: Optional[EncryptionService] = None

def get_encryption_service() -> EncryptionService:
    """Obtiene la instancia del servicio de cifrado"""
    global _encryption_service
    if _encryption_service is None:
        _encryption_service = EncryptionService()
    return _encryption_service
