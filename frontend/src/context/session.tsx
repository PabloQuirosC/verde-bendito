import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import type { Role } from "@/data/mock";
import { useStore } from "@/store/useStore";
import { decodeJwtPayload, normalizeRolesFromToken } from "@/lib/jwt";

export interface AuthUser {
  user_id: number;
  username: string;
  email?: string;
  roles: string[];
  permisos: string[];
  token: string;
}

interface SessionState {
  role: Role | null;
  user: string;
  availableRoles: Role[];
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setRole: (r: Role | null) => void;
  setUser: (u: string) => void;
  setAvailableRoles: (r: Role[]) => void;
  setAuthUser: (u: AuthUser | null) => void;
  logout: () => void;
  hasPermission: (permiso: string) => boolean;
  hasRole: (rol: string) => boolean;
}

const SessionCtx = createContext<SessionState | null>(null);

const TOKEN_KEY = "auth_token";
const LEGACY_USER_KEY = ["auth", "user"].join("_");
const LEGACY_ROLE_KEY = ["auth", "role"].join("_");

const normalizeRole = (value: string | null): Role | null => {
  const normalized = String(value ?? "").trim().toLowerCase();

  if (normalized === "mesero" || normalized === "cocina" || normalized === "cajero" || normalized === "admin") {
    return normalized;
  }

  // Mapeos de alias
  if (normalized === "administrador" || normalized === "gerente" || normalized === "1") {
    return "admin";
  }
  
  if (normalized === "cocinero" || normalized === "chef") {
    return "cocina";
  }

  if (normalized === "cajas") {
    return "cajero";
  }

  return null;
};

const normalizeRoleValue = (value: string | null | undefined) => normalizeRole(value ?? null) ?? String(value ?? "").trim().toLowerCase();

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(null);
  const [user, setUser] = useState<string>("Carlos M.");
  const [availableRoles, setAvailableRoles] = useState<Role[]>(["mesero", "cocina", "cajero", "admin"]);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  // Cargar sesión al montar el componente
  useEffect(() => {
    const savedToken = sessionStorage.getItem(TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_USER_KEY);
    sessionStorage.removeItem(LEGACY_ROLE_KEY);
    if (savedToken) {
      const payload = decodeJwtPayload(savedToken);
      if (payload) {
        const userId = Number(payload.user_id);
        const normalizedUserId = Number.isFinite(userId) && userId > 0 ? userId : 0;
        setAuthUser({
          user_id: normalizedUserId,
          username: payload.username || payload.sub || "usuario",
          email: payload.email,
          roles: normalizeRolesFromToken(payload.roles),
          permisos: Array.isArray(payload.permisos) ? payload.permisos : [],
          token: savedToken,
        });
      } else {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsHydrating(false);
  }, []);

  useEffect(() => {
    if (authUser) {
      const allowedRoles = authUser.roles.map(normalizeRole).filter((value): value is Role => value !== null);
      if (allowedRoles.length === 1) {
        setRoleState(allowedRoles[0]);
        return;
      }

      if (allowedRoles.length > 0 && !role) {
        setRoleState(allowedRoles[0]);
      }
    }
  }, [authUser, role]);

  const handleSetRole = (nextRole: Role | null) => {
    setRoleState(nextRole);
  };

  const handleSetAuthUser = (u: AuthUser | null) => {
    setAuthUser(u);
    if (u && u.token) {
      sessionStorage.setItem(TOKEN_KEY, u.token);
      sessionStorage.removeItem(LEGACY_USER_KEY);
      sessionStorage.removeItem(LEGACY_ROLE_KEY);

      const parsedUserId = Number(u.user_id);
      const normalizedUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? String(parsedUserId) : null;
      const firstRole = Array.isArray(u.roles) ? u.roles[0] : null;
      const normalizedRole = normalizeRole(firstRole) ?? "mesero";

      // Sincroniza la sesión con Zustand (flujo de comandas usa currentUserId desde useStore)
      useStore.setState({
        token: u.token,
        currentUserId: normalizedUserId,
        currentUserName: u.username ?? null,
        currentUserRole: normalizedRole,
      });
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(LEGACY_USER_KEY);
      sessionStorage.removeItem(LEGACY_ROLE_KEY);

      useStore.setState({
        token: null,
        currentUserId: null,
        currentUserName: null,
        currentUserRole: null,
      });
    }
  };

  useEffect(() => {
    if (!authUser?.token) return;

    const parsedUserId = Number(authUser.user_id);
    const normalizedUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? String(parsedUserId) : null;
    const firstRole = Array.isArray(authUser.roles) ? authUser.roles[0] : null;
    const normalizedRole = normalizeRole(firstRole) ?? "mesero";

    useStore.setState({
      token: authUser.token,
      currentUserId: normalizedUserId,
      currentUserName: authUser.username ?? null,
      currentUserRole: normalizedRole,
    });
  }, [authUser]);

  const hasPermission = (permiso: string): boolean => {
    if (authUser?.permisos?.includes(permiso)) {
      return true;
    }

    const normalizedPermission = String(permiso ?? "").trim().toLowerCase();
    const fallbackRolePermissions: Record<string, Role[]> = {
      acceder_mesas: ["mesero", "admin"],
      ver_mesas: ["mesero", "admin"],
      crear_mesa: ["mesero", "admin"],
      editar_mesa: ["mesero", "admin"],
      eliminar_mesa: ["admin"],
      acceder_cocina: ["cocina", "admin"],
      ver_tablero_cocina: ["cocina", "admin"],
      marcar_item_listo: ["cocina", "admin"],
      ver_historial_cocina: ["cocina", "admin"],
      acceder_pagos: ["cajero", "admin"],
      ver_pagos: ["cajero", "admin"],
      crear_pago: ["cajero", "admin"],
      editar_pago: ["cajero", "admin"],
      eliminar_pago: ["admin"],
    };

    const allowedRoles = fallbackRolePermissions[normalizedPermission];
    if (!allowedRoles) {
      return false;
    }

    return [role, ...(authUser?.roles ?? [])].some((roleItem) => {
      const normalizedRole = normalizeRoleValue(roleItem);
      return allowedRoles.includes(normalizedRole as Role);
    });
  };

  const hasRole = (rol: string): boolean => {
    const targetRole = normalizeRoleValue(rol);
    return authUser?.roles?.some((roleItem) => normalizeRoleValue(roleItem) === targetRole) ?? false;
  };

  const value = useMemo(
    () => ({
      role,
      user,
      availableRoles,
      authUser,
      isAuthenticated: !!authUser?.token,
      isHydrating,
      setRole: handleSetRole,
      setUser,
      setAvailableRoles,
      setAuthUser: handleSetAuthUser,
      logout: () => {
        handleSetRole(null);
        setAuthUser(null);
        try {
          sessionStorage.removeItem(LEGACY_ROLE_KEY);
        } catch {
          // Ignore storage failures in private or restricted contexts.
        }
      },
      hasPermission,
      hasRole,
    }),
    [role, user, availableRoles, authUser, isHydrating]
  );
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionCtx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
