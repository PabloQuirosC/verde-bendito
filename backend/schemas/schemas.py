from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime


class Mensaje(BaseModel):
    Numero: str
    Mensaje: str


class EnvioRequest(BaseModel):
    mensajes: List[Mensaje]


class StatusResponse(BaseModel):
    status: str
    message: str
    session_ready: bool


class Credenciales(BaseModel):
    usuario: str = Field(..., min_length=1, description="Nombre de usuario")
    contrasena: str = Field(..., min_length=1, description="Contraseña del usuario")
    country: Optional[str] = Field(
        None, min_length=2, max_length=6, description="Abreviatura del país (opcional, se obtiene de la BD)"
    )


class RespuestaExitosa(BaseModel):
    success: bool
    code: Optional[int] = 200
    message: Optional[str] = "Operación exitosa"
    token: Optional[str] = None
    data: Optional[List[str]] = []
    roles: Optional[dict | List[str]] = None
    debe_cambiar_contraseña: Optional[bool] = False
    permisos: Optional[List[str]] = []
    user_id: Optional[int] = None
    username: Optional[str] = None
    email: Optional[str] = None
    pais: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


class UsuarioInfo(BaseModel):
    id: int
    nombreUsuario: str
    activo: int
    email: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


# ============ Schemas para CRUD de Usuario ============
class UsuarioCreate(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=5, max_length=255)
    nombre_usuario: str = Field(..., min_length=1, max_length=100)
    contrasena: str = Field(..., min_length=6, max_length=255, description="Contraseña del usuario")
    pais: str = Field(..., min_length=2, max_length=10)
    activo: Optional[int] = 1


class UsuarioUpdate(BaseModel):
    nombre: Optional[str] = Field(None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    contrasena: Optional[str] = Field(None, min_length=6, max_length=255)
    pais: Optional[str] = Field(None, min_length=2, max_length=10)
    activo: Optional[int] = None


class UsuarioResponse(BaseModel):
    id: int
    nombre: str
    apellido: str
    email: str
    nombre_usuario: str
    pais: str
    activo: int
    fecha_ultimo_login: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode = True


class RolSimple(BaseModel):
    id: int
    nombre: str


class UsuarioWithRoles(UsuarioResponse):
    rol: Optional[RolSimple] = None  # Cada usuario tiene solo 1 rol


# ============ Schemas para CRUD de Permiso ============
class PermisoCreate(BaseModel):
    nombre_permiso: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    modulo: Optional[str] = Field(None, max_length=50)


class PermisoUpdate(BaseModel):
    nombre_permiso: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=255)
    modulo: Optional[str] = Field(None, max_length=50)


class PermisoResponse(BaseModel):
    id: int
    nombre_permiso: str
    descripcion: Optional[str] = None
    modulo: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


# ============ Schemas para CRUD de Rol ============
class RolCreate(BaseModel):
    nombre_rol: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = None


class RolUpdate(BaseModel):
    nombre_rol: Optional[str] = Field(None, min_length=1, max_length=100)
    descripcion: Optional[str] = None


class RolResponse(BaseModel):
    id: int
    nombre_rol: str
    descripcion: Optional[str] = None

    class Config:
        from_attributes = True
        orm_mode = True


class RolWithPermisos(RolResponse):
    permisos: List[PermisoResponse] = []


# ============ Schemas para asignación de Roles y Permisos ============
class AsignarRolRequest(BaseModel):
    usuario_id: int
    rol_id: int


class AsignarPermisoRequest(BaseModel):
    rol_id: int
    permiso_id: int


class UsuarioRolesPermisosResponse(BaseModel):
    usuario: str
    roles: List[str]
    permisos: List[str]