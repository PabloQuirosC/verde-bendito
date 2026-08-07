import { useEffect } from "react";
import { useStore } from "./useStore";
import { apiClient } from "@/lib/api";

/**
 * Hook para inicializar y sincronizar la persistencia del store con localStorage
 * Solo se ejecuta en el cliente después de la hidratación
 */
export function usePersistStore() {
  useEffect(() => {
    // Guard contra SSR - solo ejecutar en el cliente
    if (typeof window === "undefined" || typeof localStorage === "undefined") {
      return;
    }

    try {
      // Restaurar estado guardado desde localStorage
      const savedState = localStorage.getItem("mesaviva-store");
      
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          
          // El estado puede estar anidado en .state (si viene de un middleware) o directo
          const stateToRestore = parsed.state || parsed;
          
          // Restaurar TODOS los campos que guardamos
          // Filtrar órdenes rehidratadas usando la misma clave de sessionStorage
          let restoredOrders = stateToRestore.orders ?? [];
          try {
            const rawHidden = sessionStorage.getItem("hidden_order_ids");
            const normalize = (v: unknown) => String(v ?? "").trim().toLowerCase();
            const hiddenSet = new Set<string>(
              rawHidden ? (JSON.parse(rawHidden) as any[]).map((v) => normalize(v)) : [],
            );
            if (Array.isArray(restoredOrders)) {
              restoredOrders = restoredOrders.filter((o: any) => {
                const id = normalize(o?.id ?? o?.comanda_numero ?? o?.numero);
                const code = normalize(o?.code ?? o?.numero ?? o?.comanda_numero ?? o?.id);
                return !hiddenSet.has(id) && !hiddenSet.has(code);
              });
            } else {
              restoredOrders = [];
            }
          } catch {
            // ignore parse errors and keep restoredOrders as-is
          }

          useStore.setState({
            theme: stateToRestore.theme ?? "light",
            currentUserId: stateToRestore.currentUserId ?? null,
            currentUserName: stateToRestore.currentUserName ?? null,
            currentUserRole: stateToRestore.currentUserRole ?? null,
            token: stateToRestore.token ?? null,
            authHydrated: true,
            soundEnabled: stateToRestore.soundEnabled ?? false,
            products: stateToRestore.products ?? [],
            roles: Array.isArray(stateToRestore.roles) && stateToRestore.roles.length > 0
              ? stateToRestore.roles
              : useStore.getState().roles,
            categories: stateToRestore.categories ?? [],
            tables: stateToRestore.tables ?? [],
            users: stateToRestore.users ?? [],
            orders: restoredOrders,
            logs: stateToRestore.logs ?? [],
          });
          
          // Verificar que se restauró correctamente
        } catch (error) {
          console.warn("[PERSIST] Failed to parse saved state from localStorage", error);
        }
      }

      // Si el estado no tiene token, intentar restaurar desde la clave "token"
      const currentState = useStore.getState();
      if (!currentState.token) {
        try {
          const tokenFromStorage = localStorage.getItem("token");
          if (tokenFromStorage) {
            useStore.setState({ token: tokenFromStorage });
          }
        } catch (error) {
          console.warn("[PERSIST] Failed to restore token from direct localStorage key", error);
        }
      }

      // Restaurar token en apiClient
      const finalState = useStore.getState();
      if (finalState.token) {
        apiClient.setToken(finalState.token);
      }

      // Marcar que la hidratación ya terminó para habilitar redirects/guards
      useStore.setState({ authHydrated: true });

      // Suscribirse a cambios del store para guardarlo
      type StoreState = ReturnType<typeof useStore.getState>;

      const unsubscribe = useStore.subscribe((newState: StoreState) => {
        try {
          // Guardar estado completo en localStorage
          localStorage.setItem("mesaviva-store", JSON.stringify(newState));
          // Sincronizar token con apiClient siempre que el estado cambie
          if (newState.token) {
            apiClient.setToken(newState.token);
          } else {
            apiClient.clearToken();
          }
        } catch (error) {
          console.warn("[PERSIST] Failed to save state to localStorage", error);
        }
      });

      return () => unsubscribe();
    } catch (error) {
      console.warn("[PERSIST] Error in usePersistStore", error);
    }
  }, []);
}
