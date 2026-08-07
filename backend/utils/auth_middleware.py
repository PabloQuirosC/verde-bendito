from fastapi import HTTPException, status
import logging

logger = logging.getLogger(__name__)

def requiere_modulo(modulo_id: int, tipo: str = "read"):
    """
    Validador de acceso a módulos
    Similar a: if 2 not in user["paginas"]
    
    Uso en rutas:
        @router.get("/usuarios")
        async def listar_usuarios(current_user: dict = Depends(get_current_user)):
            requiere_modulo(4, "read")(current_user)
            # ...resto del código
    
    Args:
        modulo_id: ID del módulo (ej: 4 para USUARIOS)
        tipo: "read" o "write"
    """
    def validador(current_user: dict):
        # Obtener módulos del usuario
        modulos = current_user.get("modulos", [])
        permisos = current_user.get("permisos", {})
        
        # Log para depuración
        logger.info(f"Verificando acceso - Usuario: {current_user.get('sub', 'unknown')}")
        logger.info(f"  Módulo requerido: {modulo_id}, Tipo: {tipo}")
        logger.info(f"  Módulos del usuario: {modulos}")
        logger.info(f"  Permisos del usuario: {permisos}")
        
        # Validar si tiene acceso al módulo
        if modulo_id not in modulos:
            logger.warning(f"  X Acceso denegado - Módulo {modulo_id} no está en la lista")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene acceso al módulo {modulo_id}"
            )
        
        # Validar tipo de permiso
        if tipo == "write":
            # Convertir modulo_id a string porque el diccionario tiene claves string
            permiso_actual = permisos.get(str(modulo_id))
            logger.info(f"  Permiso actual para módulo {modulo_id}: {permiso_actual}")
            if permiso_actual != "write" and permiso_actual != "WRITE":
                logger.warning(f"  X Acceso denegado - Permiso de escritura requerido")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"No tiene permisos de escritura en el módulo {modulo_id}"
                )
        
        logger.info(f"  OK Acceso permitido")
        return True
        
        return True
    
    return validador
