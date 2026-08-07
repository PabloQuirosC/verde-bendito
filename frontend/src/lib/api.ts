type ApiOptions = RequestInit & { silent?: boolean };

const TOKEN_KEY = "auth_token";
const LEGACY_TOKEN_KEY = "token";

function getApiBase(): string {
  const configuredBase = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBase) {
    return configuredBase.endsWith("/") ? `${configuredBase}api` : `${configuredBase}/api`;
  }

  if (typeof window !== "undefined") {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    return `${protocol}//${host}:8000/api`;
  }

  return "http://localhost:8000/api";
}

function getToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem(TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
  }
  return null;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(LEGACY_TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

async function apiFetch(path: string, options: ApiOptions = {}) {
  const API_BASE = getApiBase();
  const url = `${API_BASE}${path}`; // http://192.168.100.64:8000/api/auth/validar-usuario
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  
  // Agregar token si está disponible (excepto en login)
  if (token && !path.includes("/auth/validar-usuario")) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const opts: RequestInit = {
    headers,
    credentials: "include",
    ...options,
  };

  const res = await fetch(url, opts);
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    // no-op: respuesta no JSON
  }
  if (!res.ok) {
    // Si el token es inválido o expiró, limpiar y lanzar error específico
    if (res.status === 401) {
      clearToken();
      const message = json?.detail || json?.message || "Token inválido o expirado";
      if (typeof window !== "undefined") {
        try {
          // redirigir al login para forzar nueva autenticación
          window.location.href = "/login";
        } catch (e) {
          // no-op
        }
      }
      const err: any = new Error(message);
      err.status = 401;
      err.body = json;
      throw err;
    }

    const detail = json?.detail;
    const message =
      (Array.isArray(detail)
        ? detail.map((item) => item?.msg ?? item?.message ?? String(item)).join("; ")
        : detail) || json?.message || res.statusText || "Error desconocido";
    const err: any = new Error(message);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  return json;
}

export async function loginUser(usuario: string, contrasena: string, country?: string) {
  return apiFetch("/auth/validar-usuario", {
    method: "POST",
    body: JSON.stringify({ usuario, contrasena, country }),
  });
}

export async function getMe() {
  return apiFetch("/auth/me", { method: "GET" });
}

export async function logoutUser() {
  return apiFetch("/auth/logout", { method: "POST" });
}

export async function listarUsuarios(skip = 0, limit = 100) {
  return apiFetch(`/usuarios/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerUsuario(usuarioId: number | string) {
  return apiFetch(`/usuarios/${usuarioId}`, { method: "GET" });
}

export async function obtenerHistorialNotificaciones(topic: string) {
  return apiFetch(`/notifications/history/${topic}`, { method: "GET" });
}

export async function crearUsuario(data: unknown) {
  return apiFetch("/usuarios", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarUsuario(usuarioId: number | string, data: unknown) {
  return apiFetch(`/usuarios/${usuarioId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarUsuario(usuarioId: number | string) {
  return apiFetch(`/usuarios/${usuarioId}`, { method: "DELETE" });
}

export async function asignarRolAUsuario(usuarioId: number | string, rolId: number) {
  return apiFetch(`/usuarios/${usuarioId}/roles`, {
    method: "POST",
    body: JSON.stringify({ usuario_id: Number(usuarioId), rol_id: rolId }),
  });
}

export async function removerRolDeUsuario(usuarioId: number | string, rolId: number) {
  return apiFetch(`/usuarios/${usuarioId}/roles/${rolId}`, {
    method: "DELETE",
  });
}

export async function obtenerPermisosUsuario(usuarioId: number | string) {
  return apiFetch(`/usuarios/${usuarioId}/permisos`, { method: "GET" });
}

export async function listarRoles(skip = 0, limit = 100) {
  return apiFetch(`/roles/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerRol(rolId: number | string) {
  return apiFetch(`/roles/${rolId}`, { method: "GET" });
}

export async function crearRol(data: unknown) {
  return apiFetch("/roles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarRol(rolId: number | string, data: unknown) {
  return apiFetch(`/roles/${rolId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarRol(rolId: number | string) {
  return apiFetch(`/roles/${rolId}`, { method: "DELETE" });
}

export async function listarPermisos(skip = 0, limit = 100, modulo?: string) {
  const moduloQuery = modulo ? `&modulo=${encodeURIComponent(modulo)}` : "";
  return apiFetch(`/permisos/?skip=${skip}&limit=${limit}${moduloQuery}`, { method: "GET" });
}

export async function obtenerPermiso(permisoId: number | string) {
  return apiFetch(`/permisos/${permisoId}`, { method: "GET" });
}

export async function listarProveedores(skip = 0, limit = 100) {
  return apiFetch(`/proveedores/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function listarEstadosProveedor() {
  return apiFetch("/proveedores/estados", { method: "GET" });
}

export async function listarCompras(skip = 0, limit = 100) {
  return apiFetch(`/compras/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerCompra(compraId: number | string) {
  return apiFetch(`/compras/${compraId}`, { method: "GET" });
}

export async function crearCompra(data: unknown) {
  return apiFetch("/compras/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarCompra(compraId: number | string, data: unknown) {
  return apiFetch(`/compras/${compraId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function actualizarDetalleCompra(compraId: number | string, detalleId: number | string, data: unknown) {
  return apiFetch(`/compras/${compraId}/detalles/${detalleId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarCompra(compraId: number | string) {
  return apiFetch(`/compras/${compraId}`, {
    method: "DELETE",
  });
}

export async function obtenerProveedor(proveedorId: number | string) {
  return apiFetch(`/proveedores/${proveedorId}`, { method: "GET" });
}

export async function crearProveedor(data: unknown) {
  return apiFetch("/proveedores", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarProveedor(proveedorId: number | string, data: unknown) {
  return apiFetch(`/proveedores/${proveedorId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarProveedor(proveedorId: number | string) {
  return apiFetch(`/proveedores/${proveedorId}`, { method: "DELETE" });
}

export async function listarInventario(skip = 0, limit = 100) {
  return apiFetch(`/inventario/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerMovimientoInventario(movimientoId: number | string) {
  return apiFetch(`/inventario/${movimientoId}`, { method: "GET" });
}

export async function crearMovimientoInventario(data: unknown) {
  return apiFetch("/inventario/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function movimientosPorProducto(productoId: number | string, skip = 0, limit = 100) {
  return apiFetch(`/inventario/producto/${productoId}?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function movimientosPorTipo(tipo: string, skip = 0, limit = 100) {
  return apiFetch(`/inventario/tipo/${tipo}?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function asignarPermisoARol(rolId: number | string, permisoId: number) {
  return apiFetch(`/roles/${rolId}/permisos`, {
    method: "POST",
    body: JSON.stringify({ rol_id: Number(rolId), permiso_id: permisoId }),
  });
}

export async function removerPermisoDeRol(rolId: number | string, permisoId: number) {
  return apiFetch(`/roles/${rolId}/permisos/${permisoId}`, { method: "DELETE" });
}

export async function resetearContraseña(usuarioId: number | string) {
  return apiFetch(`/usuarios/${usuarioId}/reset-password`, {
    method: "POST",
  });
}

export async function cambiarPassword(usuarioId: number | string, data: unknown) {
  return apiFetch(`/usuarios/${usuarioId}/cambiar-password`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Dashboard endpoints
export async function getDashboardStats() {
  return apiFetch("/dashboard/stats", { method: "GET" });
}

export async function getVentasMensuales() {
  return apiFetch("/dashboard/ventas-mensuales", { method: "GET" });
}

export async function getVentasProductos() {
  return apiFetch("/dashboard/ventas-productos", { method: "GET" });
}

export async function getMediosPago() {
  return apiFetch("/dashboard/medios-pago", { method: "GET" });
}

export async function getVentasDiarias() {
  return apiFetch("/dashboard/ventas-diarias", { method: "GET" });
}

export async function getCanalesVenta() {
  return apiFetch("/dashboard/canales-venta", { method: "GET" });
}

export async function listarProductos(skip = 0, limit = 100) {
  return apiFetch(`/productos/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerProducto(productoId: number | string) {
  return apiFetch(`/productos/${productoId}`, { method: "GET" });
}

export async function crearProducto(data: unknown) {
  return apiFetch("/productos", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarProducto(productoId: number | string, data: unknown) {
  return apiFetch(`/productos/${productoId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarProducto(productoId: number | string) {
  return apiFetch(`/productos/${productoId}`, { method: "DELETE" });
}

export async function listarCategorias(skip = 0, limit = 100) {
  return apiFetch(`/categorias/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerCategoria(categoriaId: number | string) {
  return apiFetch(`/categorias/${categoriaId}`, { method: "GET" });
}

export async function crearCategoria(data: unknown) {
  return apiFetch("/categorias", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarCategoria(categoriaId: number | string, data: unknown) {
  return apiFetch(`/categorias/${categoriaId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarCategoria(categoriaId: number | string) {
  return apiFetch(`/categorias/${categoriaId}`, { method: "DELETE" });
}

export async function eliminarCategoriaConReasignacion(categoriaId: number | string, reassignTo?: number) {
  const suffix = reassignTo ? `?reassign_to=${reassignTo}` : "";
  return apiFetch(`/categorias/${categoriaId}${suffix}`, { method: "DELETE" });
}

// Mesas
export async function listarMesas(skip = 0, limit = 100) {
  return apiFetch(`/mesas/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerMesa(mesaId: number | string) {
  return apiFetch(`/mesas/${mesaId}`, { method: "GET" });
}

export async function crearMesa(data: unknown) {
  return apiFetch("/mesas/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarMesa(mesaId: number | string, data: unknown) {
  return apiFetch(`/mesas/${mesaId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarMesa(mesaId: number | string) {
  return apiFetch(`/mesas/${mesaId}`, { method: "DELETE" });
}

export async function mesasDisponibles() {
  return apiFetch("/mesas/disponibles/list", { method: "GET" });
}

export async function mesasOcupadas() {
  return apiFetch("/mesas/ocupadas/list", { method: "GET" });
}

// Comandas
export async function crearComanda(data: any) {
  // Solo enviar campos válidos según ComandaCreate schema
  const payload: any = {};
  
  if (data?.mesa_id !== undefined && data?.mesa_id !== null) {
    payload.mesa_id = Number(data.mesa_id);
  }
  if (data?.cliente_id !== undefined && data?.cliente_id !== null) {
    payload.cliente_id = Number(data.cliente_id);
  }
  if (data?.usuario_mesero_id !== undefined && data?.usuario_mesero_id !== null) {
    const meseroId = Number(data.usuario_mesero_id);
    if (Number.isFinite(meseroId) && meseroId > 0) {
      payload.usuario_mesero_id = meseroId;
    }
  }
  if (data?.tipo_cliente !== undefined) {
    payload.tipo_cliente = data.tipo_cliente;
  } else {
    payload.tipo_cliente = "local";
  }
  if (data?.notas !== undefined && data?.notas !== null && data?.notas !== "") {
    payload.notas = data.notas;
  }
  
  const result = await apiFetch("/comandas/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return result;
}

export async function listarComandasAbiertas(skip = 0, limit = 100) {
  return apiFetch(`/comandas/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerComandaMesa(mesaId: number | string) {
  return apiFetch(`/comandas/mesa/${mesaId}`, { method: "GET" });
}

export async function obtenerComanda(comandaId: number | string) {
  return apiFetch(`/comandas/${comandaId}`, { method: "GET" });
}

export async function obtenerComandaPorNumero(numero: number | string) {
  return apiFetch(`/comandas/numero/${numero}`, { method: "GET" });
}

export async function agregarItemComanda(comandaId: number | string, data: unknown) {
  return apiFetch(`/comandas/${comandaId}/items`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarComanda(id: number | string, data: unknown) {
  return apiFetch(`/comandas/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function registrarPago(data: unknown) {
  return apiFetch("/pagos/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function obtenerPagosComanda(comandaId: number | string) {
  return apiFetch(`/pagos/comanda/${comandaId}`, { method: "GET" });
}

export async function cerrarComanda(comandaId: number | string) {
  return apiFetch(`/comandas/${comandaId}/cerrar`, { method: "POST" });
}

export async function reabrirComanda(comandaId: number | string) {
  return apiFetch(`/comandas/${comandaId}/reabrir`, { method: "POST" });
}

// Auditoría / Bitácora
export async function getAuditoria(skip = 0, limit = 100) {
  return apiFetch(`/auditoria/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function getAuditoriaTypes() {
  return apiFetch("/auditoria/types", { method: "GET" });
}

// Configuración / hardware
export async function getConfiguracion() {
  return apiFetch("/configuracion/", { method: "GET" });
}

export async function updateConfiguracion(data: unknown) {
  return apiFetch("/configuracion/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getHardwareSettings() {
  return apiFetch("/hardware/", { method: "GET" });
}

export async function updateHardwareSettings(data: unknown) {
  return apiFetch("/hardware/", {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function testPrinter(address?: string | null, name?: string | null) {
  const params = new URLSearchParams();
  if (address) params.set("address", address);
  if (name) params.set("name", name);
  const query = params.toString();
  return apiFetch(`/hardware/test/printer${query ? `?${query}` : ""}`, { method: "POST" });
}

export async function testValidator(device?: string | null) {
  const params = new URLSearchParams();
  if (device) params.set("device", device);
  const query = params.toString();
  return apiFetch(`/hardware/test/validator${query ? `?${query}` : ""}`, { method: "POST" });
}

export async function validateDevice(data: unknown) {
  return apiFetch("/hardware/validate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Facturas
export async function obtenerFactura(facturaId: number | string) {
  return apiFetch(`/facturas/${facturaId}`, { method: "GET" });
}

export async function crearFactura(data: unknown) {
  return apiFetch("/facturas/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function anularFactura(facturaId: number | string) {
  return apiFetch(`/facturas/${facturaId}/anular`, { method: "PUT" });
}

// Clientes
export async function listarClientes(skip = 0, limit = 100) {
  return apiFetch(`/clientes/?skip=${skip}&limit=${limit}`, { method: "GET" });
}

export async function obtenerCliente(clienteId: number | string) {
  return apiFetch(`/clientes/${clienteId}`, { method: "GET" });
}

export async function buscarClientesPorNombre(nombre: string) {
  return apiFetch(`/clientes/buscar/nombre?nombre=${encodeURIComponent(nombre)}`, { method: "GET" });
}

export async function crearCliente(data: unknown) {
  return apiFetch("/clientes/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function actualizarCliente(clienteId: number | string, data: unknown) {
  return apiFetch(`/clientes/${clienteId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function eliminarCliente(clienteId: number | string) {
  return apiFetch(`/clientes/${clienteId}`, { method: "DELETE" });
}

export const apiClient: any = {
  login: loginUser,
  getMe,
  logout: logoutUser,
  setToken,
  clearToken,
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  eliminarUsuario,
  asignarRolAUsuario,
  removerRolDeUsuario,
  obtenerPermisosUsuario,
  listarRoles,
  listarCompras,
  obtenerCompra,
  crearCompra,
  actualizarCompra,
  eliminarCompra,
  obtenerRol,
  crearRol,
  actualizarRol,
  eliminarRol,
  listarPermisos,
  obtenerPermiso,
  listarProveedores,
  obtenerProveedor,
  crearProveedor,
  actualizarProveedor,
  eliminarProveedor,
  listarProductos,
  obtenerProducto,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  listarCategorias,
  obtenerCategoria,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  eliminarCategoriaConReasignacion,
  listarMesas,
  obtenerMesa,
  crearMesa,
  actualizarMesa,
  eliminarMesa,
  mesasDisponibles,
  mesasOcupadas,
  crearComanda,
  listarComandasAbiertas,
  obtenerComandaMesa,
  obtenerComanda,
  obtenerComandaPorNumero,
  agregarItemComanda,
  actualizarComanda,
  registrarPago,
  obtenerPagosComanda,
  cerrarComanda,
  reabrirComanda,
  listarInventario,
  obtenerMovimientoInventario,
  crearMovimientoInventario,
  movimientosPorProducto,
  movimientosPorTipo,
  asignarPermisoARol,
  removerPermisoDeRol,
  resetearContraseña,
  cambiarPassword,
  getDashboardStats,
  getVentasMensuales,
  getVentasProductos,
  getMediosPago,
  getVentasDiarias,
  getCanalesVenta,
  getAuditoria,
  getAuditoriaTypes,
  getConfiguracion,
  updateConfiguracion,
  getHardwareSettings,
  updateHardwareSettings,
  testPrinter,
  testValidator,
  validateDevice,
  obtenerFactura,
  crearFactura,
  anularFactura,
  listarClientes,
  obtenerCliente,
  buscarClientesPorNombre,
  crearCliente,
  actualizarCliente,
  eliminarCliente,
};

export default apiClient;
