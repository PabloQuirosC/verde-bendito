from pydantic import BaseModel
from typing import Optional, List, Dict


# ============ AUTH ============

class LoginRequest(BaseModel):
    """Schema para login con usuario y contraseña"""
    usuario: str
    contraseña: str


class Token(BaseModel):
    """Schema para response de token"""
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema para datos del token"""
    usuario: Optional[str] = None
    modulos: List[int] = []
    permisos: Dict[int, str] = {}


# ============ USUARIOS ============

class UsuarioBase(BaseModel):
    usuario: str
    correo_electronico: Optional[str] = None
    nombre_completo: Optional[str] = None
    status: str = "activo"


class UsuarioCreate(UsuarioBase):
    contraseña: str


class UsuarioUpdate(BaseModel):
    correo_electronico: Optional[str] = None
    nombre_completo: Optional[str] = None
    status: Optional[str] = None
    contraseña: Optional[str] = None


class UsuarioOut(UsuarioBase):
    class Config:
        from_attributes = True


# ============ ROLES ============

class RolBase(BaseModel):
    rol: str
    descripcion: Optional[str] = None


class RolCreate(RolBase):
    pass


class RolUpdate(BaseModel):
    rol: Optional[str] = None
    descripcion: Optional[str] = None


class RolOut(RolBase):
    id_rol: int

    class Config:
        from_attributes = True


# ============ PERMISOS ============

class PermisoBase(BaseModel):
    nombre: str
    tipo: str  # "READ" o "WRITE"
    modulos: str  # CSV de módulos: "1,2,3"
    descripcion: Optional[str] = None


class PermisoCreate(PermisoBase):
    pass


class PermisoUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    modulos: Optional[str] = None
    descripcion: Optional[str] = None


class PermisoOut(PermisoBase):
    id_permiso: int

    class Config:
        from_attributes = True


# ============ RELACIONES ============

class RolPermisoCreate(BaseModel):
    id_rol: int
    id_permiso: int


class UsuarioRolCreate(BaseModel):
    usuario: str
    id_rol: int


class UsuarioRolOut(BaseModel):
    usuario: str
    id_rol: int

    class Config:
        from_attributes = True
