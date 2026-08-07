import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/session";
import { getRouteByRole } from "@/lib/role-routes";

/**
 * Componente que redirecciona automáticamente al menú del rol
 * Si el usuario ya está autenticado, va directamente a su rol
 * Si no está autenticado, redirige a login
 */
export function AutoRoleRedirect() {
  const nav = useNavigate();
  const { isAuthenticated, authUser } = useSession();

  useEffect(() => {
    if (!isAuthenticated || !authUser) {
      // Si no está autenticado, redirige a login
      nav("/", { replace: true });
      return;
    }

    // Si está autenticado, redirige al menú del rol
    const route = getRouteByRole(authUser.roles);
    nav(route === "/roles" ? "/" : route, { replace: true });
  }, [isAuthenticated, authUser, nav]);

  return null; // No renderiza nada
}
