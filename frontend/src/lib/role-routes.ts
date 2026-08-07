/**
 * Mapeo de roles a rutas principales
 * Usado para redireccionar automáticamente después del login
 */

export const roleRoutes: Record<string, string> = {
  mesero: "/mesero/mesas",
  user: "/mesero/mesas",
  usuario: "/mesero/mesas",
  sistema: "/mesero/mesas",
  cocina: "/cocina",
  cocinero: "/cocina", // Alias para "cocina"
  cajero: "/cajero",
  cajas: "/cajero",
  admin: "/admin",
  administrador: "/admin", // Alias para "admin" en español
};

/**
 * Obtiene la ruta principal según el rol del usuario
 * Si tiene múltiples roles, usa el primero disponible
 * @param roles - Array de roles del usuario
 * @returns Ruta a navegar
 */
export function getRouteByRole(roles: string[]): string {
  if (!roles || roles.length === 0) {
    return "/mesero/mesas"; // Fallback seguro cuando hay token pero no hay rol usable
  }

  // Buscar el primer rol que tenga una ruta mapeada
  for (const role of roles) {
    const normalized = String(role ?? "").trim().toLowerCase();
    if (roleRoutes[normalized]) {
      return roleRoutes[normalized];
    }
  }

  return "/mesero/mesas"; // Fallback seguro si backend manda rol no mapeado
}

/**
 * Obtiene la ruta principal según el rol actual seleccionado
 * @param currentRole - Rol actual seleccionado
 * @returns Ruta a navegar
 */
export function getRouteByCurrentRole(currentRole: string | null): string {
  if (!currentRole) return "/mesero/mesas";
  const normalized = String(currentRole).trim().toLowerCase();
  return roleRoutes[normalized] || "/mesero/mesas";
}
