from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import date, datetime
from decimal import Decimal


# ============ Configuracion Schemas ============
class ConfiguracionCreate(BaseModel):
    nombre_negocio: str = Field(..., max_length=200)
    ruc: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = None
    ciudad: Optional[str] = Field(None, max_length=100)
    pais: Optional[str] = Field(None, max_length=100)
    telefono: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    sitio_web: Optional[str] = Field(None, max_length=255)
    moneda: str = Field("USD", max_length=3)
    idioma: str = Field("es", max_length=2)
    impuesto: Decimal = Field(13.00)
    horario_apertura: Optional[str] = None
    horario_cierre: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=500)
    # Ticket personalization
    tagline: Optional[str] = Field(None, max_length=200)
    footer: Optional[str] = None
    show_logo: Optional[int] = Field(None)
    show_tax: Optional[int] = Field(None)
    show_service: Optional[int] = Field(None)
    show_qr: Optional[int] = Field(None)
    accent: Optional[str] = Field(None, max_length=20)


class ConfiguracionResponse(ConfiguracionCreate):
    id: int
    fecha_creacion: datetime
    activo: int

    class Config:
        from_attributes = True


# ============ Mesa Schemas ============
class MesaCreate(BaseModel):
    numero: int
    capacidad: Optional[int] = None
    ubicacion: Optional[str] = Field(None, max_length=100)
    estado: str = Field("disponible")  # disponible, ocupada, reservada, mantenimiento


class MesaUpdate(BaseModel):
    numero: Optional[int] = None
    capacidad: Optional[int] = None
    ubicacion: Optional[str] = Field(None, max_length=100)
    estado: Optional[str] = None
    activo: Optional[int] = None


class MesaResponse(BaseModel):
    id: int
    numero: int
    capacidad: Optional[int] = None
    ubicacion: Optional[str] = None
    estado: str
    fecha_creacion: datetime
    activo: int

    class Config:
        from_attributes = True


# ============ Categoria Schemas ============
class CategoriaCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)


class CategoriaUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    emoji: Optional[str] = Field(None, max_length=10)
    activo: Optional[bool] = None


class CategoriaResponse(BaseModel):
    id: int
    nombre: str
    emoji: Optional[str] = None
    fecha_creacion: datetime
    activo: int

    class Config:
        from_attributes = True


# ============ Producto Schemas ============
class ProductoCreate(BaseModel):
    nombre: str = Field(..., max_length=200)
    categoria_id: int
    precio: Decimal = Field(..., gt=0)
    stock: int = Field(0, ge=0)
    stock_minimo: int = Field(5, ge=0)
    activo: bool = True


class ProductoUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=200)
    categoria_id: Optional[int] = None
    precio: Optional[Decimal] = None
    stock: Optional[int] = None
    stock_minimo: Optional[int] = None
    activo: Optional[bool] = None


class ProductoResponse(BaseModel):
    id: int
    nombre: str
    categoria_id: int
    precio: Decimal
    stock: int
    stock_minimo: int
    fecha_creacion: datetime
    activo: bool

    class Config:
        from_attributes = True


# ============ Cliente Schemas ============
class ClienteCreate(BaseModel):
    nombre: str = Field(..., max_length=100)
    apellido: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=20)
    cedula_ruc: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = None
    ciudad: Optional[str] = Field(None, max_length=100)
    pais: Optional[str] = Field(None, max_length=100)
    limite_credito: Optional[Decimal] = None
    saldo_credito: Optional[Decimal] = None
    nacimiento: Optional[date] = None


class ClienteUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=100)
    apellido: Optional[str] = Field(None, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    telefono: Optional[str] = Field(None, max_length=20)
    cedula_ruc: Optional[str] = Field(None, max_length=50)
    direccion: Optional[str] = None
    ciudad: Optional[str] = Field(None, max_length=100)
    pais: Optional[str] = Field(None, max_length=100)
    limite_credito: Optional[Decimal] = None
    saldo_credito: Optional[Decimal] = None
    nacimiento: Optional[date] = None
    activo: Optional[int] = None


class ClienteResponse(BaseModel):
    id: int
    nombre: str
    apellido: Optional[str] = None
    email: Optional[str] = None
    telefono: Optional[str] = None
    cedula_ruc: Optional[str] = None
    direccion: Optional[str] = None
    ciudad: Optional[str] = None
    pais: Optional[str] = None
    limite_credito: Optional[Decimal] = None
    saldo_credito: Optional[Decimal] = None
    nacimiento: Optional[date] = None
    fecha_registro: datetime
    activo: int

    class Config:
        from_attributes = True


# ============ Comanda Schemas ============
class DetalleComandaCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(..., ge=1)
    precio_unitario: Optional[float] = None
    notas: Optional[str] = None
    prioridad: Optional[str] = Field("media")


class DetalleComandaUpdate(BaseModel):
    cantidad: Optional[int] = Field(None, ge=1)
    estado: Optional[str] = None
    notas: Optional[str] = None
    prioridad: Optional[str] = None


class DetalleComandaResponse(BaseModel):
    id: int
    comanda_id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Optional[Decimal] = None
    estado: str
    notas: Optional[str] = None
    prioridad: Optional[str] = None
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class ComandaCreate(BaseModel):
    mesa_id: Optional[int] = None
    cliente_id: Optional[int] = None
    usuario_mesero_id: Optional[int] = None
    tipo_cliente: str = Field("local")  # local, para_llevar, delivery
    notas: Optional[str] = None


class ComandaUpdate(BaseModel):
    estado: Optional[str] = None
    cliente_id: Optional[int] = None
    descuento: Optional[Decimal] = None
    notas: Optional[str] = None


class ComandaResponse(BaseModel):
    id: int
    numero: str
    mesa_id: Optional[int] = None
    cliente_id: Optional[int] = None
    fecha_creacion: datetime
    fecha_cierre: Optional[datetime] = None
    usuario_mesero_id: Optional[int] = None
    usuario_cajero_id: Optional[int] = None
    subtotal: Optional[Decimal] = None
    impuesto: Optional[Decimal] = None
    descuento: Decimal = 0
    total: Optional[Decimal] = None
    estado: str
    tipo_cliente: str
    notas: Optional[str] = None
    detalles: List[DetalleComandaResponse] = []

    class Config:
        from_attributes = True


# ============ Pago Schemas ============
class PagoCreate(BaseModel):
    comanda_id: int
    monto: Decimal = Field(..., gt=0)
    tipo_pago: str = Field("efectivo")
    referencia_pago: Optional[str] = Field(None, max_length=100)
    banco: Optional[str] = Field(None, max_length=100)
    ultimos_digitos: Optional[str] = Field(None, max_length=10)
    cuotas: int = Field(1, ge=1)
    notas: Optional[str] = None


class PagoResponse(BaseModel):
    id: int
    comanda_id: int
    monto: Decimal
    tipo_pago: str
    referencia_pago: Optional[str] = None
    banco: Optional[str] = None
    ultimos_digitos: Optional[str] = None
    cuotas: int
    fecha_pago: datetime
    usuario_id: int
    notas: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Factura Schemas ============
class FacturaCreate(BaseModel):
    numero_factura: str = Field(..., max_length=50)
    comanda_id: int
    cliente_id: Optional[int] = None
    fecha_vencimiento: Optional[date] = None
    notas: Optional[str] = None


class FacturaResponse(BaseModel):
    id: int
    numero_factura: str
    comanda_id: int
    cliente_id: Optional[int] = None
    usuario_id: int
    fecha_emision: datetime
    subtotal: Optional[Decimal] = None
    impuesto: Optional[Decimal] = None
    total: Decimal
    estado_pago: str
    fecha_vencimiento: Optional[date] = None
    notas: Optional[str] = None
    xml_path: Optional[str] = None
    pdf_path: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Proveedor Schemas ============
class ProveedorCreate(BaseModel):
    nombre: str = Field(..., max_length=200)
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    contacto_telefono: Optional[str] = Field(None, max_length=20)
    contacto_email: Optional[str] = Field(None, max_length=255)
    direccion: Optional[str] = None
    condicion_pago: Optional[str] = Field(None, max_length=100)
    dias_credito: Optional[int] = None


class ProveedorUpdate(BaseModel):
    nombre: Optional[str] = Field(None, max_length=200)
    contacto_nombre: Optional[str] = Field(None, max_length=100)
    contacto_telefono: Optional[str] = Field(None, max_length=20)
    contacto_email: Optional[str] = Field(None, max_length=255)
    direccion: Optional[str] = None
    condicion_pago: Optional[str] = Field(None, max_length=100)
    dias_credito: Optional[int] = None
    activo: Optional[int] = None


class ProveedorResponse(BaseModel):
    id: int
    nombre: str
    contacto_nombre: Optional[str] = None
    contacto_telefono: Optional[str] = None
    contacto_email: Optional[str] = None
    direccion: Optional[str] = None
    condicion_pago: Optional[str] = None
    dias_credito: Optional[int] = None
    activo: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True


class ProveedorEstadoFiltro(BaseModel):
    codigo: str
    etiqueta: str
    activo: Optional[int] = None
    cantidad: int


# ============ Compra Schemas ============
class DetalleCompraCreate(BaseModel):
    producto_id: int
    cantidad: int = Field(..., ge=1)
    precio_unitario: Decimal = Field(..., gt=0)
    lote: Optional[str] = Field(None, max_length=100)
    fecha_expiracion: Optional[date] = None


class DetalleCompraResponse(BaseModel):
    id: int
    compra_id: int
    producto_id: int
    cantidad: int
    precio_unitario: Decimal
    subtotal: Optional[Decimal] = None
    lote: Optional[str] = None
    fecha_expiracion: Optional[date] = None

    class Config:
        from_attributes = True


class DetalleCompraUpdate(BaseModel):
    cantidad: Optional[int] = Field(None, ge=1)
    precio_unitario: Optional[Decimal] = Field(None, gt=0)
    lote: Optional[str] = Field(None, max_length=100)
    fecha_expiracion: Optional[date] = None


class CompraCreate(BaseModel):
    numero: str = Field(..., max_length=50)
    proveedor_id: int
    usuario_id: int
    total: Decimal = Field(..., gt=0)
    subtotal: Optional[Decimal] = None
    impuesto: Optional[Decimal] = None
    estado: Optional[str] = None
    fecha_entrega_esperada: Optional[date] = None
    fecha_entrega: Optional[datetime] = None
    descripcion: Optional[str] = None
    detalles: List[DetalleCompraCreate] = []


class CompraUpdate(BaseModel):
    estado: Optional[str] = None
    fecha_entrega_esperada: Optional[date] = None
    fecha_entrega: Optional[datetime] = None
    descripcion: Optional[str] = None


class CompraResponse(BaseModel):
    id: int
    numero: str
    fecha: datetime
    proveedor_id: int
    usuario_id: int
    subtotal: Optional[Decimal] = None
    impuesto: Optional[Decimal] = None
    total: Decimal
    estado: str
    fecha_entrega_esperada: Optional[date] = None
    fecha_entrega: Optional[datetime] = None
    descripcion: Optional[str] = None
    detalles: List[DetalleCompraResponse] = []

    class Config:
        from_attributes = True


# ============ Inventario Schemas ============
class InventarioCreate(BaseModel):
    producto_id: int
    cantidad_cambio: int
    tipo_movimiento: str  # entrada, salida, ajuste, devolucion, perdida
    razon: Optional[str] = None
    proveedor_id: Optional[int] = None
    compra_id: Optional[int] = None


class InventarioResponse(BaseModel):
    id: int
    producto_id: int
    cantidad_anterior: Optional[int] = None
    cantidad_nueva: Optional[int] = None
    cantidad_cambio: Optional[int] = None
    tipo_movimiento: str
    razon: Optional[str] = None
    usuario_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    compra_id: Optional[int] = None
    fecha_movimiento: datetime

    class Config:
        from_attributes = True


# ============ Auditoria Schemas ============
class AuditoriaResponse(BaseModel):
    id: int
    usuario_id: Optional[int] = None
    nombre_usuario: Optional[str] = None
    accion: str
    modulo: Optional[str] = None
    tabla_afectada: Optional[str] = None
    registro_id: Optional[int] = None
    datos_antes: Optional[Dict[str, Any]] = None
    datos_despues: Optional[Dict[str, Any]] = None
    fecha_accion: datetime
    ip_usuario: Optional[str] = None
    navegador: Optional[str] = None
    dispositivo: Optional[str] = None

    class Config:
        from_attributes = True


# ============ Response Generales ============
class GenericResponse(BaseModel):
    success: bool
    code: int = 200
    message: str = "Operación exitosa"
    data: Optional[Any] = None


class PaginatedResponse(BaseModel):
    success: bool
    code: int = 200
    message: str = "Operación exitosa"
    total: int
    pagina: int
    limite: int
    total_paginas: int
    data: List[Any]
