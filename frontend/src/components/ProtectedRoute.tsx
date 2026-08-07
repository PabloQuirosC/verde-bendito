import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSession } from "@/context/session";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  requiredPermission?: string;
}

/**
 * ProtectedRoute: Componente para proteger rutas que requieren autenticación
 * 
 * Usos:
 * - Básico (solo autenticación): <ProtectedRoute><Dashboard /></ProtectedRoute>
 * - Con rol: <ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>
 * - Con permiso: <ProtectedRoute requiredPermission="ver_reportes"><Reports /></ProtectedRoute>
 */
export function ProtectedRoute({
  children,
  requiredRole,
  requiredPermission,
}: ProtectedRouteProps) {
  const { isAuthenticated, isHydrating, hasRole, hasPermission } = useSession();

  // 0. Esperar a que la sesión se haya hidratado desde sessionStorage
  if (isHydrating) {
    return null; // O un spinner si quieres
  }

  // 1. Verificar autenticación
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 2. Verificar rol si es requerido
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/roles" replace />;
  }

  // 3. Verificar permiso si es requerido
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/perfil" replace />;
  }

  return <>{children}</>;
}
