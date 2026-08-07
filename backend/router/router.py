from fastapi import APIRouter
from .auth_router import router as auth_router
from .usuario_router import router as usuario_router
from .rol_router import router as rol_router
from .permiso_router import router as permiso_router
from .modulo_router import router as modulo_router
from .propiedades_router import router as propiedades_router

# Router principal que agrupa todos los routers
api_router = APIRouter()

# Incluir todos los routers
api_router.include_router(auth_router)
api_router.include_router(usuario_router)
api_router.include_router(rol_router)
api_router.include_router(permiso_router)
api_router.include_router(modulo_router)
api_router.include_router(propiedades_router)

__all__ = ["api_router"]
