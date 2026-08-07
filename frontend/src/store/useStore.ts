import { create } from "zustand";
import {
  initialProducts,
  initialTables,
  initialUsers,
} from "./mockData";
import type {
  AuditLog,
  CategoryDef,
  ModuleId,
  Order,
  OrderItem,
  OrderStatus,
  Payment,
  Product,
  RestaurantTable,
  Role,
  RoleDef,
  User,
} from "./types";
import { ALL_MODULES } from "./types";
import { TAX_RATE } from "@/lib/format";
import { apiClient } from "@/lib/api";
import { decodeJwtPayload, normalizeRolesFromToken } from "@/lib/jwt";

type Theme = "light" | "dark";

interface State {
  theme: Theme;
  currentUserId: string | null;
  currentUserName: string | null;
  currentUserRole: Role | null;
  token: string | null;
  authHydrated: boolean;
  // control del modal forzado de cambio de contraseña
  forceChangePasswordModalOpen: boolean;
  setForceChangePasswordModalOpen: (v: boolean) => void;
  products: Product[];
  categories: CategoryDef[];
  roles: RoleDef[];
  tables: RestaurantTable[];
  users: User[];
  orders: Order[];
  hiddenOrderIds: string[];
  logs: AuditLog[];
  soundEnabled: boolean;

  // setters
  toggleTheme: () => void;
  toggleSound: () => void;

  // auth
  login: (username: string, password: string) => Promise<User | null>;
  logout: () => void;
  initializeAuth: () => void;
  currentUser: () => User | null;
  modulesFor: (role: Role) => ModuleId[];
  labelFor: (role: Role) => string;

  // products
  upsertProduct: (p: Product) => void;
  removeProduct: (id: string) => void;

  // categories
  upsertCategory: (c: CategoryDef) => void;
  removeCategory: (id: string) => void;

  // roles
  upsertRole: (r: RoleDef) => Promise<void>;
  removeRole: (id: string) => Promise<void>;

  // tables
  setTableStatus: (tableId: string, status: RestaurantTable["status"]) => void;

  // orders
  createOrder: (tableId: string) => Order;
  addItem: (orderId: string, item: Omit<OrderItem, "id">) => void;
  updateItemQty: (orderId: string, itemId: string, qty: number) => void;
  removeItem: (orderId: string, itemId: string) => void;
  sendToKitchen: (orderId: string) => void;
  setOrderStatus: (orderId: string, status: OrderStatus) => void;
  payOrder: (orderId: string, payment: Payment) => void;
  payOrderSplit: (orderId: string, payments: Payment[]) => void;
  returnToWaiter: (orderId: string) => void;
  sendToCashier: (orderId: string) => void;
  clearTable: (orderId: string) => void;

  // users
  upsertUser: (u: User) => Promise<void>;
  removeUser: (id: string) => Promise<void>;

  log: (action: string, detail?: string, scope?: AuditLog["scope"]) => void;

  // ===== API OPERATIONS =====
  // Productos
  loadProducts: () => Promise<void>;
  apiCreateProduct: (data: any) => Promise<boolean>;
  apiUpdateProduct: (id: number, data: any) => Promise<boolean>;
  apiDeleteProduct: (id: number) => Promise<boolean>;

  // Categorías
  loadCategories: () => Promise<void>;
  apiCreateCategory: (data: any) => Promise<boolean>;
  apiUpdateCategory: (id: number, data: any) => Promise<boolean>;
  apiDeleteCategory: (id: number, reassignTo?: number) => Promise<boolean>;

  // Inventario
  apiCreateMovimiento: (data: any) => Promise<boolean>;
  apiListarInventario: () => Promise<any[]>;
  apiMovimientosPorProducto: (productoId: number) => Promise<any[]>;

  // Mesas
  loadTables: () => Promise<void>;
  apiCreateTable: (data: any) => Promise<boolean>;
  apiUpdateTable: (id: number, data: any) => Promise<boolean>;
  apiDeleteTable: (id: number) => Promise<boolean>;
  apiCreateOrder: (data: any) => Promise<Order | null>;
  apiLoadOrdersOpen: () => Promise<void>;
  hideOrder: (orderId: string) => void;
  removeOrder: (orderId: string) => void;

  // Comandas
  apiAddItemToOrder: (orderId: number, data: any) => Promise<boolean>;
  apiCloseOrder: (orderId: number) => Promise<boolean>;
  apiReopenOrder: (orderId: number) => Promise<boolean>;

  // Clientes
  loadClients: () => Promise<void>;
  apiCreateClient: (data: any) => Promise<boolean>;
  apiUpdateClient: (id: number, data: any) => Promise<boolean>;
  apiDeleteClient: (id: number) => Promise<boolean>;

  // Pagos
  apiRegisterPayment: (data: any) => Promise<boolean>;

  // Usuarios y Roles
  loadUsers: () => Promise<void>;
  loadRoles: () => Promise<void>;
}

const DEFAULT_ROLES: RoleDef[] = [
  { id: "mesero", label: "Mesero", modules: ["mesas", "notificaciones"], system: true },
  { id: "cocina", label: "Cocina", modules: ["cocina"], system: true },
  { id: "cajero", label: "Cajero", modules: ["caja"], system: true },
  { id: "admin", label: "Administrador", modules: [...ALL_MODULES], system: true },
];

const DEFAULT_CATEGORIES: CategoryDef[] = [
  { id: "entradas", name: "Entradas", emoji: "🥗" },
  { id: "principales", name: "Principales", emoji: "🍛" },
  { id: "bebidas", name: "Bebidas", emoji: "🥤" },
  { id: "postres", name: "Postres", emoji: "🍰" },
  { id: "cafeteria", name: "Cafetería", emoji: "☕" },
];

const recalc = (items: OrderItem[]) => {
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax };
};

const newId = () => Math.random().toString(36).slice(2, 10);
const orderCode = (orders: Order[]) => {
  const next = orders.reduce((max, order) => {
    const match = /^ver(\d+)$/i.exec(order.code);
    if (!match) return max;
    const value = Number(match[1]);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);

  return `ver${next + 1}`;
};

const clearTableLogs = (logs: AuditLog[], tableId: string) =>
  logs.filter((entry) => entry.scope?.tableId !== tableId);

const HIDDEN_ORDERS_KEY = "hidden_order_ids";

const normalizeOrderKey = (value: unknown): string => String(value ?? "").trim().toLowerCase();

const loadHiddenOrderIds = (): string[] => {
  try {
    if (typeof window === "undefined") return [];
    const raw = sessionStorage.getItem(HIDDEN_ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.map((value) => normalizeOrderKey(value)).filter(Boolean)
      : [];
  } catch {
    return [];
  }
};

const saveHiddenOrderIds = (ids: string[]) => {
  try {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(HIDDEN_ORDERS_KEY, JSON.stringify(ids));
  } catch {
    // no-op
  }
};

export const useStore = create<State>()((set, get) => ({
      theme: "light",
      currentUserId: null,
  currentUserName: null,
  currentUserRole: null,
      token: null,
  authHydrated: false,
      products: [],
      categories: [],
      roles: DEFAULT_ROLES,
      tables: initialTables,
      users: initialUsers,
      orders: [],
      hiddenOrderIds: loadHiddenOrderIds(),
      logs: [],
      soundEnabled: true,
      forceChangePasswordModalOpen: false,

      toggleTheme: () =>
        set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
      setForceChangePasswordModalOpen: (v: boolean) => set({ forceChangePasswordModalOpen: v }),

      // ===== Auth =====
      login: async (username, password) => {
        try {
          const response = await apiClient.login({
            usuario: username,
            contrasena: password,
          });

          if (response.success && response.token) {
            const payload = decodeJwtPayload(response.token);
            if (!payload) {
              throw new Error("Token inválido");
            }

            // Guardar token en localStorage (tanto en apiClient como en localStorage directo)
            apiClient.setToken(response.token);
            try {
              if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
                localStorage.setItem("token", response.token);
              }
            } catch {
              // Silently fail in SSR
              console.warn("[LOGIN] Failed to save token to localStorage");
            }
            
            const normalizedRoles = normalizeRolesFromToken(payload.roles);
            const roleId = normalizedRoles[0] || "mesero";
            const authUserId = Number(payload.user_id);
            const normalizedAuthUserId = Number.isFinite(authUserId) && authUserId > 0 ? String(authUserId) : null;

            // Crear usuario local con info del backend
            const user: User = {
              id: normalizedAuthUserId || payload.username || payload.sub || username,
              name: payload.username || payload.sub || username,
              username: payload.username || payload.sub || username,
              password, // No deberíamos guardar esto, pero lo dejamos por compatibilidad
              role: roleId,
              active: true,
              // Fallback: si el backend no retorna el flag, pero la contraseña usada fue 'Soporte', forzarlo en cliente.
              debe_cambiar_contraseña: password === "Soporte",
            };

            // IMPORTANTE: Agregar el usuario al store si no existe
            set((state) => ({
              // Garantizar que currentUserId siempre tenga un valor útil.
              // Si el token no devuelve un user_id numérico, usar el `user.id` como fallback.
              currentUserId: normalizedAuthUserId || user.id,
              currentUserName: user.username,
              currentUserRole: user.role,
              token: response.token,
              users: state.users.some((u) => u.id === user.id)
                ? state.users
                : [...state.users, user],
            }));

            // Si el usuario requiere cambio de contraseña, forzar apertura del modal global
            if (user.debe_cambiar_contraseña) {
              set({ forceChangePasswordModalOpen: true });
            }
            
            get().log("Inicio de sesión", user.name);
            return user;
          }
          return null;
        } catch (error) {
          console.error("Error en login:", error);
          return null;
        }
      },

      logout: () => {
        const u = get().currentUser();
        if (u) get().log("Cierre de sesión", u.name);
        apiClient.clearToken();
        try {
          if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
            localStorage.removeItem("token");
          }
        } catch {
          // Silently fail in SSR
        }
        set({ currentUserId: null, currentUserName: null, currentUserRole: null, token: null });
      },

      initializeAuth: () => {
        // Restaurar token desde localStorage cuando se carga la app
        try {
          if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
            const savedToken = localStorage.getItem("token");
            if (savedToken) {
              apiClient.setToken(savedToken);
              // Rehidratar usuario actual desde token para evitar sesiones con currentUserId nulo.
              void (async () => {
                try {
                  const me = await apiClient.getMe();
                  const rawId = me?.user_id;
                  const userId = Number(rawId);
                  const normalizedUserId = Number.isFinite(userId) && userId > 0 ? String(userId) : null;

                  const username = me?.usuario || me?.username || get().currentUserName;
                  const roles = me?.roles;
                  const rawRole = Array.isArray(roles) ? roles[0] : (roles?.nombre || roles);
                  const role = String(rawRole || get().currentUserRole || "mesero").trim().toLowerCase();

                  set({
                    token: savedToken,
                    currentUserId: normalizedUserId,
                    currentUserName: username || null,
                    currentUserRole: role as Role,
                    // asegurarse modal cerrado por defecto al rehidratar
                    forceChangePasswordModalOpen: false,
                  });
                } catch (error) {
                  console.error("Error rehidratando sesión:", error);
                }
              })();
            }
          }
        } catch {
          // Silently fail in SSR
        }
      },

      currentUser: () => {
        const id = get().currentUserId;
        if (!id) return null;
        return get().users.find((u) => u.id === id) ?? null;
      },

      modulesFor: (role) => {
        const r = get().roles.find((x) => x.id === role);
        if (r?.modules?.length) return r.modules;

        const normalized = String(role ?? "").trim().toLowerCase();
        if (["admin", "administrador", "gerente", "1"].includes(normalized)) {
          return [...ALL_MODULES];
        }
        if (["mesero", "waiter"].includes(normalized)) return ["mesas", "notificaciones"];
        if (["cocina", "cocinero", "chef"].includes(normalized)) return ["cocina"];
        if (["caja", "cajero"].includes(normalized)) return ["caja"];
        return [];
      },

      labelFor: (role) => {
        const r = get().roles.find((x) => x.id === role);
        return r?.label ?? role;
      },

      // ===== Roles =====
      upsertRole: async (r) => {
        try {
          // Preparar datos para el backend
          const roleData = {
            nombre_rol: r.label,
            descripcion: `Rol: ${r.label}`,
            activo: true,
          };

          let roleId: number | string;
          // Solo actualizar si el ID es numérico (del backend)
          if (r.id && /^\d+$/.test(r.id)) {
            // Editar rol existente (ID numérico del backend)
            roleId = parseInt(r.id);
            await apiClient.actualizarRol(roleId, roleData);
          } else {
            // Crear nuevo rol
            const createdRole = await apiClient.crearRol(roleData);
            // El backend puede responder directo { id, ... } o envuelto en { data: { id } }
            roleId = createdRole?.data?.id ?? (createdRole as any)?.id ?? r.id;
          }

          // Sincronizar permisos basados en módulos
          if (typeof roleId === 'number' || (typeof roleId === 'string' && /^\d+$/.test(roleId))) {
            const numRoleId = typeof roleId === 'number' ? roleId : parseInt(roleId);
            
            // Obtener todos los permisos disponibles
            const permisosResponse = await apiClient.listarPermisos(0, 500);
            const todosPermisos = Array.isArray(permisosResponse) ? permisosResponse : (permisosResponse.data || []);
            
            // Mapear módulos a IDs de permisos
            const permisoIds = todosPermisos
              .filter((p: any) => r.modules.includes(p.modulo || p.module))
              .map((p: any) => p.id);
            
            // Obtener permisos actuales del rol
            const rolActual = await apiClient.obtenerRol(numRoleId);
            const permisosActuales = (rolActual?.permisos || []).map((p: any) => p.id || p);
            
            // Eliminar permisos que no deben estar
            for (const pid of permisosActuales) {
              if (!permisoIds.includes(pid)) {
                await apiClient.removerPermisoDeRol(numRoleId, pid).catch(() => {});
              }
            }
            
            // Agregar permisos que deben estar
            for (const pid of permisoIds) {
              if (!permisosActuales.includes(pid)) {
                await apiClient.asignarPermisoARol(numRoleId, pid).catch(() => {});
              }
            }
          }

          // Actualizar estado local
          set((s) => {
            const exists = s.roles.some((x) => x.id === r.id);
            return {
              roles: exists
                ? s.roles.map((x) => (x.id === r.id ? { ...x, ...r, system: x.system } : x))
                : [...s.roles, { ...r, id: String(roleId) }],
            };
          });
        } catch (error) {
          console.error("Error al guardar rol:", error);
          throw error;
        }
      },

      removeRole: async (id) => {
        try {
          const s = get();
          const r = s.roles.find((x) => x.id === id);
          if (!r || r.system) return;
          if (s.users.some((u) => u.role === id)) return; // hay usuarios asignados

          // Eliminar del backend si tiene ID numérico
          if (!id.includes('-')) {
            await apiClient.eliminarRol(parseInt(id));
          }

          // Actualizar estado local
          set((s) => ({ roles: s.roles.filter((x) => x.id !== id) }));
        } catch (error) {
          console.error("Error al eliminar rol:", error);
        }
      },

      upsertProduct: (p) =>
        set((s) => {
          const exists = s.products.some((x) => x.id === p.id);
          return {
            products: exists
              ? s.products.map((x) => (x.id === p.id ? p : x))
              : [...s.products, p],
          };
        }),

      removeProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      upsertCategory: (c) =>
        set((s) => {
          const exists = s.categories.some((x) => x.id === c.id);
          return {
            categories: exists
              ? s.categories.map((x) => (x.id === c.id ? c : x))
              : [...s.categories, c],
          };
        }),

      removeCategory: (id) =>
        set((s) => {
          // No permitir eliminar si hay productos en esa categoría
          if (s.products.some((p) => p.category === id)) return s;
          return { categories: s.categories.filter((c) => c.id !== id) };
        }),

      setTableStatus: (tableId, status) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === tableId
              ? { ...t, status, currentOrderId: status === "libre" ? undefined : t.currentOrderId }
              : t,
          ),
        })),

      createOrder: (tableId) => {
        const u = get().currentUser();
        const table = get().tables.find((t) => t.id === tableId)!;
        const orders = get().orders;
        const order: Order = {
          id: newId(),
          code: orderCode(orders),
          tableId,
          tableNumber: table.number,
          waiterId: u?.id ?? "system",
          waiterName: u?.name ?? "Sistema",
          items: [],
          status: "borrador",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          subtotal: 0,
          tax: 0,
          total: 0,
        };
        set((s) => ({
          orders: [...s.orders, order],
          tables: s.tables.map((t) =>
            t.id === tableId
              ? { ...t, status: "ocupada", currentOrderId: order.id }
              : t,
          ),
        }));
        get().log("Mesa abierta", `Mesa ${table.number} por ${u?.name ?? "Sistema"}`);
        return order;
      },

      addItem: (orderId, item) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const existing = o.items.find((i) => i.productId === item.productId);
            const items = existing
              ? o.items.map((i) =>
                  i.productId === item.productId
                    ? { ...i, qty: i.qty + item.qty }
                    : i,
                )
              : [...o.items, { ...item, id: newId() }];
            return { ...o, items, ...recalc(items), updatedAt: new Date().toISOString() };
          }),
        })),

      updateItemQty: (orderId, itemId, qty) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const items = qty <= 0
              ? o.items.filter((i) => i.id !== itemId)
              : o.items.map((i) => (i.id === itemId ? { ...i, qty } : i));
            return { ...o, items, ...recalc(items) };
          }),
        })),

      removeItem: (orderId, itemId) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const items = o.items.filter((i) => i.id !== itemId);
            return { ...o, items, ...recalc(items) };
          }),
        })),

      sendToKitchen: (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order || order.items.length === 0) return;
        // descontar inventario
        set((s) => ({
          products: s.products.map((p) => {
            const item = order.items.find((i) => i.productId === p.id);
            return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
          }),
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "pendiente", updatedAt: new Date().toISOString() }
              : o,
          ),
          tables: s.tables.map((t) =>
            t.id === order.tableId ? { ...t, status: "proceso" } : t,
          ),
        }));
        get().log("Orden enviada a cocina", `${order.code} mesa ${order.tableNumber}`);
      },

      setOrderStatus: (orderId, status) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status, updatedAt: new Date().toISOString() }
              : o,
          ),
        }));
        const order = get().orders.find((o) => o.id === orderId);
        if (order && status === "listo") {
          set((s) => ({
            tables: s.tables.map((t) =>
              t.id === order.tableId ? { ...t, status: "porCobrar" } : t,
            ),
          }));
        }
        get().log(`Estado: ${status}`, order?.code);
      },

      payOrder: (orderId, payment) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "cobrado", payment, updatedAt: new Date().toISOString() }
              : o,
          ),
          tables: s.tables.map((t) =>
            t.id === order.tableId
              ? { ...t, status: "libre", currentOrderId: undefined }
              : t,
          ),
          logs: clearTableLogs(s.logs, order.tableId),
        }));
      },

      payOrderSplit: (orderId, payments) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        const total = payments.reduce((s, p) => s + p.amount, 0);
        const merged: Payment = {
          method: payments[0]?.method ?? "efectivo",
          amount: total,
          reference: `Split ×${payments.length}: ${payments.map((p) => `${p.method} ${p.amount}`).join(" | ")}`,
        };
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "cobrado", payment: merged, updatedAt: new Date().toISOString() }
              : o,
          ),
          tables: s.tables.map((t) =>
            t.id === order.tableId
              ? { ...t, status: "libre", currentOrderId: undefined }
              : t,
          ),
          logs: clearTableLogs(s.logs, order.tableId),
        }));
      },

      returnToWaiter: (orderId) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status: "borrador" } : o,
          ),
        }));
        get().log("Orden devuelta a mesero");
      },

      sendToCashier: (orderId) => {
        const order = get().orders.find((o) => o.id === orderId);
        if (!order) return;
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? { ...o, status: "listo", updatedAt: new Date().toISOString() }
              : o,
          ),
          tables: s.tables.map((t) =>
            t.id === order.tableId ? { ...t, status: "porCobrar" } : t,
          ),
        }));
        get().log("Enviada a caja", order.code);
      },

      clearTable: (orderId) => {
        set((s) => {
          const order = s.orders.find((o) => o.id === orderId);
          const targetTableId = order?.tableId ?? s.tables.find((table) => table.currentOrderId === orderId)?.id;
          if (!targetTableId) return {};
          return {
            tables: s.tables.map((t) =>
              t.id === targetTableId ? { ...t, status: "libre", currentOrderId: undefined } : t,
            ),
            logs: order ? clearTableLogs(s.logs, order.tableId) : s.logs,
          };
        });
      },

      upsertUser: async (u) => {
        try {
          const isBackendId = /^\d+$/.test(u.id);
          const roleId = Number(u.role);
          const [firstName, ...lastNameParts] = u.name.trim().split(/\s+/);
          const nombre = firstName || u.name.trim();
          const apellido = lastNameParts.join(" ") || "N/A";
          const email = u.email || `${u.username}@local.app`;
          const pais = "CR";

          if (isBackendId) {
            // Editar usuario existente
            await apiClient.actualizarUsuario(Number(u.id), {
              nombre,
              apellido,
              email,
              pais,
              activo: u.active ? 1 : 0,
            });

            // Si el rol es numérico, persistir asignación de rol
            if (Number.isFinite(roleId) && roleId > 0) {
              await apiClient.asignarRolAUsuario(Number(u.id), roleId);
            }
          } else {
            // Crear nuevo usuario con payload requerido por backend
            const createdUser: any = await apiClient.crearUsuario({
              nombre,
              apellido,
              email,
              nombre_usuario: u.username,
              contrasena: "Soporte", // Always Soporte for new users
              pais,
              activo: u.active ? 1 : 0,
            });

            const newId = String(createdUser?.id ?? u.id);

            // Si el rol es numérico, persistir asignación de rol en el usuario creado
            if (Number.isFinite(roleId) && roleId > 0 && /^\d+$/.test(newId)) {
              await apiClient.asignarRolAUsuario(Number(newId), roleId);
            }

            // Immediately reset password to guarantee debe_cambiar_contraseña flag in DB/auth backend
            if (/^\d+$/.test(newId)) {
              await apiClient.resetearContraseña(Number(newId));
            }

            // Sincronizar id local temporal con id real de BD
            u = { ...u, id: newId, debe_cambiar_contraseña: true };
          }

          set((s) => {
            const exists = s.users.some((x) => x.id === u.id);
            return {
              users: exists
                ? s.users.map((x) => (x.id === u.id ? u : x))
                : [...s.users, u],
            };
          });
        } catch (error) {
          console.error("Error al guardar usuario:", error);
          throw error;
        }
      },

      removeUser: async (id) => {
        try {
          // Eliminar del backend si tiene ID numérico
          if (/^\d+$/.test(id)) {
            await apiClient.eliminarUsuario(Number(id));
          }

          // Actualizar estado local
          set((s) => ({ users: s.users.filter((u) => u.id !== id) }));
        } catch (error) {
          console.error("Error al eliminar usuario:", error);
          throw error;
        }
      },

      log: (action, detail, scope) =>
        set((s) => ({
          logs: [
            {
              id: newId(),
              at: new Date().toISOString(),
              user: get().currentUserName ?? get().currentUser()?.name ?? get().currentUser()?.username ?? "Sistema",
              action,
              detail,
              scope,
            },
            ...s.logs,
          ].slice(0, 200),
        })),

      // ===== API OPERATIONS =====
      // Productos
      loadProducts: async () => {
        try {
          const response = await apiClient.listarProductos(0, 500);
          if (response.success && response.data) {
            const products = response.data.map((p: any) => ({
              id: p.id.toString(),
              name: p.nombre,
              category: p.categoria_id?.toString() || "otros",
              price: p.precio,
              stock: p.stock || 0,
              minStock: typeof p.stock_minimo !== "undefined" ? p.stock_minimo : 5,
              active: p.activo !== false,
            }));
            set({ products });
          }
        } catch (error) {
          console.error("Error loading products:", error);
        }
      },

      apiCreateProduct: async (data) => {
        try {
          const response = await apiClient.crearProducto(data);
          if (response.success && response.data) {
            const newProduct = {
              id: response.data.id.toString(),
              name: response.data.nombre,
              category: response.data.categoria_id?.toString() || "otros",
              price: response.data.precio,
              stock: response.data.stock || 0,
              minStock: typeof response.data.stock_minimo !== "undefined" ? response.data.stock_minimo : 5,
              active: response.data.activo !== false,
            };
            set((s) => ({ products: [...s.products, newProduct] }));
            get().log("Producto creado", response.data.nombre);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error creating product:", error);
          return false;
        }
      },

      apiUpdateProduct: async (id, data) => {
        try {
          const response = await apiClient.actualizarProducto(id, data);
          if (response.success) {
            const updatedProduct = {
              id: id.toString(),
              name: data.nombre,
              category: data.categoria_id?.toString() || "otros",
              price: data.precio,
              stock: data.stock || 0,
              minStock: typeof data.stock_minimo !== "undefined" ? data.stock_minimo : 5,
              active: data.activo !== false,
            };
            set((s) => ({
              products: s.products.map((p) => (p.id === id.toString() ? updatedProduct : p)),
            }));
            get().log("Producto actualizado", data.nombre);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating product:", error);
          return false;
        }
      },

      apiDeleteProduct: async (id) => {
        try {
          const response = await apiClient.eliminarProducto(id);
          if (response.success) {
            set((s) => ({ products: s.products.filter((p) => p.id !== id.toString()) }));
            get().log("Producto eliminado", `ID: ${id}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error deleting product:", error);
          return false;
        }
      },

      loadCategories: async () => {
        try {
          const response = await apiClient.listarCategorias(0, 1000);
          if (response.success && response.data) {
            const cats = response.data.map((c: any) => ({
              id: c.id.toString(),
              name: c.nombre,
              emoji: c.emoji || "🏷️",
            }));
            set({ categories: cats });
          }
        } catch (error) {
          console.error("Error loading categories:", error);
        }
      },

      apiCreateCategory: async (data) => {
        try {
          const response = await apiClient.crearCategoria(data);
          if (response.success && response.data) {
            const newCategory = {
              id: response.data.id.toString(),
              name: response.data.nombre,
              emoji: response.data.emoji || "🏷️",
            };
            set((s) => ({ categories: [...s.categories, newCategory] }));
            get().log("Categoría creada", response.data.nombre);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error creating category:", error);
          return false;
        }
      },

      apiUpdateCategory: async (id, data) => {
        try {
          const response = await apiClient.actualizarCategoria(id, data);
          if (response.success) {
            const updatedCategory = {
              id: id.toString(),
              name: data.nombre,
              emoji: data.emoji || "🏷️",
            };
            set((s) => ({
              categories: s.categories.map((c) => (c.id === id.toString() ? updatedCategory : c)),
            }));
            get().log("Categoría actualizada", data.nombre);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating category:", error);
          return false;
        }
      },

      apiDeleteCategory: async (id, reassignTo) => {
        try {
          const response = reassignTo ? await apiClient.eliminarCategoriaConReasignacion(id, reassignTo) : await apiClient.eliminarCategoria(id);
          if (response.success) {
            set((s) => ({ categories: s.categories.filter((c) => c.id !== id.toString()) }));
            get().log("Categoría eliminada", `ID: ${id}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error deleting category:", error);
          return false;
        }
      },

      // Inventario
      apiCreateMovimiento: async (data) => {
        try {
          const response = await apiClient.crearMovimientoInventario(data);
          if (response.success && response.data) {
            // Actualizar stock del producto en la lista local
            set((s) => ({
              products: s.products.map((p) =>
                p.id === data.producto_id.toString()
                  ? { ...p, stock: response.data.cantidad_nueva }
                  : p
              ),
            }));
            get().log("Movimiento de inventario registrado", `Tipo: ${data.tipo_movimiento}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error creating inventory movement:", error);
          return false;
        }
      },

      apiListarInventario: async () => {
        try {
          const response = await apiClient.listarInventario(0, 500);
          if (response.success && response.data) {
            return response.data;
          }
          return [];
        } catch (error) {
          console.error("Error loading inventory:", error);
          return [];
        }
      },

      apiMovimientosPorProducto: async (productoId: number) => {
        try {
          const response = await apiClient.movimientosPorProducto(productoId, 0, 100);
          if (response.success && response.data) {
            return response.data;
          }
          return [];
        } catch (error) {
          console.error("Error loading product movements:", error);
          return [];
        }
      },

      // Mesas
      loadTables: async () => {
        try {
          const response = await apiClient.listarMesas(0, 500);
          if (response.success && response.data) {
            const tables = response.data.map((m: any) => ({
              id: m.id.toString(),
              number: m.numero,
              capacity: m.capacidad || 4,
              zone: (m.ubicacion || "Salón") as RestaurantTable["zone"],
              status: m.estado === "disponible" ? "libre" : "ocupada" as RestaurantTable["status"],
              currentOrderId: undefined,
            }));
            set({ tables });
          }
        } catch (error) {
          console.error("Error loading tables:", error);
        }
      },

      apiCreateTable: async (data) => {
        try {
          const response = await apiClient.crearMesa(data);
          if (response.success && response.data) {
            const newTable = {
              id: response.data.id.toString(),
              number: response.data.numero,
              capacity: data.capacidad || 4,
              zone: (data.ubicacion || "Salón") as RestaurantTable["zone"],
              status: "libre" as RestaurantTable["status"],
              currentOrderId: undefined,
            };
            set((s) => ({ tables: [...s.tables, newTable] }));
            get().log("Mesa creada", `Mesa ${response.data.numero}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error creating table:", error);
          return false;
        }
      },

      apiUpdateTable: async (id, data) => {
        try {
          const response = await apiClient.actualizarMesa(id, data);
          if (response.success) {
            const updatedTable = {
              id: id.toString(),
              number: data.numero,
              capacity: data.capacidad || 4,
              zone: (data.ubicacion || "Salón") as RestaurantTable["zone"],
              status: data.estado === "disponible" ? "libre" : "ocupada" as RestaurantTable["status"],
              currentOrderId: undefined,
            };
            set((s) => ({
              tables: s.tables.map((t) => (t.id === id.toString() ? updatedTable : t)),
            }));
            get().log("Mesa actualizada", `Mesa ${data.numero}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating table:", error);
          return false;
        }
      },

      apiDeleteTable: async (id) => {
        try {
          const response = await apiClient.eliminarMesa(id);
          if (response.success) {
            set((s) => ({
              tables: s.tables.filter((t) => t.id !== id.toString()),
            }));
            get().log("Mesa eliminada", `Mesa ${id}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error deleting table:", error);
          return false;
        }
      },

      apiCreateOrder: async (data) => {
        try {
          const response = await apiClient.crearComanda(data);
          if (response.success && response.data?.id) {
            const newOrder: Order = {
              id: String(response.data.id),
              code: String(response.data.numero || ""),
              tableId: String(data.mesa_id),
              tableNumber: data.mesa_numero || 0,
              waiterId: get().currentUserId || get().currentUser()?.id || "system",
              waiterName: get().currentUserName ?? get().currentUser()?.name ?? get().currentUser()?.username ?? "Sistema",
              items: [],
              status: "borrador",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              subtotal: 0,
              tax: 0,
              total: 0,
            };
            set((s) => ({
              orders: [...s.orders, newOrder],
              tables: s.tables.map((t) =>
                t.id === String(data.mesa_id)
                  ? { ...t, status: "ocupada", currentOrderId: newOrder.id }
                  : t,
              ),
            }));
            get().log("Comanda creada", newOrder.code, {
              entityType: "comanda",
              entityId: newOrder.id,
              tableId: newOrder.tableId,
            });
            return newOrder;
          }
          console.error("Invalid response data:", response);
          return null;
        } catch (error) {
          console.error("Error creating order:", error);
          return null;
        }
      },

      apiLoadOrdersOpen: async () => {
        try {
          const hiddenOrderIds = new Set(loadHiddenOrderIds().map(normalizeOrderKey));
          const response = await apiClient.listarComandasAbiertas(0, 500);
          if (response.success && Array.isArray(response.data)) {
            const orders = response.data
              .filter((c: any) => c?.id !== null && c?.id !== undefined)
              .filter((c: any) => c?.estado === "abierta")
              .filter((c: any) => !hiddenOrderIds.has(normalizeOrderKey(c.id)) && !hiddenOrderIds.has(normalizeOrderKey(c.numero)))
              .map((c: any) => {
                const mesaId = c?.mesa_id ?? null;
                const mesaNumero = c?.mesa_numero ?? 0;
                return {
                  id: String(c.id),
                  code: String(c.numero ?? c.id),
                  tableId: mesaId !== null && mesaId !== undefined ? String(mesaId) : `sin-mesa-${c.id}`,
                  tableNumber: Number(mesaNumero) || 0,
                  waiterId: c?.usuario_mesero_id !== null && c?.usuario_mesero_id !== undefined ? String(c.usuario_mesero_id) : "system",
                  waiterName: c?.usuario_nombre || get().currentUserName || "Sistema",
                  clientName: c?.cliente_nombre || undefined,
                  clientType: c?.tipo_cliente || "local",
                  items: [],
                  status: c?.estado === "abierta" ? "borrador" : (c?.estado || "borrador"),
                  createdAt: c?.fecha_creacion || new Date().toISOString(),
                  updatedAt: c?.fecha_actualizacion || c?.fecha_creacion || new Date().toISOString(),
                  subtotal: Number(c?.subtotal) || 0,
                  tax: Number(c?.impuesto) || 0,
                  total: Number(c?.total) || 0,
                };
              });
            set({ orders });
          }
        } catch (error) {
          console.error("Error loading open orders:", error);
        }
      },

      hideOrder: (orderId) => {
        const currentHidden = get().hiddenOrderIds ?? [];
        const normalizedId = normalizeOrderKey(orderId);
        const nextHidden = Array.from(new Set([...currentHidden.map(normalizeOrderKey), normalizedId]));
        saveHiddenOrderIds(nextHidden);
        set((s) => ({
          hiddenOrderIds: nextHidden,
          orders: s.orders.filter((o) => normalizeOrderKey(o.id) !== normalizedId && normalizeOrderKey(o.code) !== normalizedId),
        }));
      },

      removeOrder: (orderId) => {
        set((s) => ({
          orders: s.orders.filter((o) => normalizeOrderKey(o.id) !== normalizeOrderKey(orderId) && normalizeOrderKey(o.code) !== normalizeOrderKey(orderId)),
        }));
      },

      // Comandas
      apiAddItemToOrder: async (orderId, data) => {
        try {
          const response = await apiClient.agregarItemComanda(orderId, data);
          if (response.success) {
            const orderIdStr = orderId.toString();
            const order = get().orders.find((o) => o.id === orderIdStr);

            if (order) {
              const productId = String((data as any)?.producto_id ?? "");
              const quantity = Number((data as any)?.cantidad ?? 1) || 1;
              const notes = (data as any)?.notas ? String((data as any).notas) : undefined;
              const priceFromPayload = Number((data as any)?.precio_unitario);
              const product = get().products.find((p) => p.id === productId);
              const price = Number.isFinite(priceFromPayload) && priceFromPayload > 0
                ? priceFromPayload
                : Number(product?.price ?? 0);
              const newItem: OrderItem = {
                id: newId(),
                productId,
                name: product?.name ?? `Producto ${productId}`,
                price,
                qty: quantity,
                notes,
              };

              set((s) => {
                const nextOrders = s.orders.map((currentOrder) => {
                  if (currentOrder.id !== orderIdStr) return currentOrder;

                  const existingItem = currentOrder.items.find((item) => item.productId === productId);
                  const items = existingItem
                    ? currentOrder.items.map((item) =>
                        item.productId === productId
                          ? {
                              ...item,
                              qty: item.qty + quantity,
                              notes: notes ?? item.notes,
                            }
                          : item,
                      )
                    : [...currentOrder.items, newItem];

                  const shouldPromoteToKitchen = currentOrder.status === "borrador";

                  return {
                    ...currentOrder,
                    items,
                    ...recalc(items),
                    status: shouldPromoteToKitchen ? "pendiente" : currentOrder.status,
                    updatedAt: new Date().toISOString(),
                  };
                });

                return {
                  orders: nextOrders,
                  tables: s.tables.map((table) =>
                    order && table.id === order.tableId && order.status === "borrador"
                      ? { ...table, status: "proceso" }
                      : table,
                  ),
                };
              });
            }

            get().log("Item agregado a comanda", `Cantidad: ${data.cantidad}`, {
              entityType: "comanda",
              entityId: orderIdStr,
              tableId: order?.tableId,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error adding item to order:", error);
          return false;
        }
      },

      apiCloseOrder: async (orderId) => {
        try {
          const response = await apiClient.cerrarComanda(orderId);
          if (response.success) {
            set((s) => ({
              orders: s.orders.map((o) =>
                o.id === orderId.toString() ? { ...o, status: "cerrada" } : o,
              ),
            }));
            const order = get().orders.find((o) => o.id === orderId.toString());
            get().log("Comanda cerrada", `ID: ${orderId}`, {
              entityType: "comanda",
              entityId: orderId.toString(),
              tableId: order?.tableId,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error closing order:", error);
          return false;
        }
      },

      apiReopenOrder: async (orderId) => {
        try {
          const response = await apiClient.reabrirComanda(orderId);
          if (response.success) {
            const order = get().orders.find((o) => o.id === orderId.toString());
            set((s) => ({
              orders: s.orders.map((o) =>
                o.id === orderId.toString() ? { ...o, status: "borrador", updatedAt: new Date().toISOString() } : o,
              ),
              tables: s.tables.map((t) =>
                order && t.id === order.tableId
                  ? { ...t, status: "ocupada", currentOrderId: orderId.toString() }
                  : t,
              ),
            }));
            get().log("Comanda reabierta", `ID: ${orderId}`, {
              entityType: "comanda",
              entityId: orderId.toString(),
              tableId: order?.tableId,
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error reopening order:", error);
          return false;
        }
      },

      // Clientes
      loadClients: async () => {
        try {
          const response = await apiClient.listarClientes(0, 500);
          if (response.success && response.data) {
            // Actualizar estado si existe una lista de usuarios separada para clientes
            // o simplemente registrar que los datos se cargaron
          }
        } catch (error) {
          console.error("Error loading clients:", error);
        }
      },

      apiCreateClient: async (data) => {
        try {
          const response = await apiClient.crearCliente(data);
          if (response.success) {
            get().log("Cliente creado", response.data?.nombre || "Nuevo cliente");
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error creating client:", error);
          return false;
        }
      },

      apiUpdateClient: async (id, data) => {
        try {
          const response = await apiClient.actualizarCliente(id, data);
          if (response.success) {
            get().log("Cliente actualizado", data.nombre);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error updating client:", error);
          return false;
        }
      },

      apiDeleteClient: async (id) => {
        try {
          const response = await apiClient.eliminarCliente(id);
          if (response.success) {
            get().log("Cliente eliminado", `ID: ${id}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error deleting client:", error);
          return false;
        }
      },

      // Pagos
      apiRegisterPayment: async (data) => {
        try {
          const response = await apiClient.registrarPago(data);
          if (response.success) {
            get().log("Pago registrado", `Monto: ${data.monto}`);
            return true;
          }
          return false;
        } catch (error) {
          console.error("Error registering payment:", error);
          return false;
        }
      },

      // ===== USUARIOS Y ROLES =====
      loadUsers: async () => {
        try {
          const response = await apiClient.listarUsuarios(0, 500);
          const usersData = Array.isArray(response)
            ? response
            : Array.isArray((response as any).data)
              ? (response as any).data
              : [];

          const roleMapping: Record<string, string> = {
            administrador: "admin",
            admin: "admin",
            gerente: "admin",
            mesero: "mesero",
            waiter: "mesero",
            cocinero: "cocina",
            cocina: "cocina",
            chef: "cocina",
            cajero: "cajero",
            caja: "cajero",
            cajas: "cajero",
          };

          const normalizeRoleId = (userRole: any) => {
            const roleName = String(userRole?.nombre ?? userRole?.nombre_rol ?? "").trim().toLowerCase();
            const roleId = String(userRole?.id ?? userRole?.rol_id ?? "").trim();
            if (roleId) return roleId;
            return roleMapping[roleName] || roleName || "mesero";
          };

          if (usersData.length > 0) {
            const mappedUsers: User[] = usersData.map((u: any) => ({
              id: u.id.toString(),
              name: [u.nombre, u.apellido].filter(Boolean).join(" ").trim(),
              email: u.email,
              username: u.nombre_usuario,
              password: "",
              role: normalizeRoleId(u.rol),
              active: Boolean(u.activo),
              debe_cambiar_contraseña: Boolean(u.debe_cambiar_contraseña),
            }));
            set({ users: mappedUsers });
          } else {
            set({ users: [] });
          }
        } catch (error) {
          console.error("Error loading users:", error);
        }
      },

      loadRoles: async () => {
        try {
          const response = await apiClient.listarRoles(0, 500);
          const rolesData = Array.isArray(response)
            ? response
            : Array.isArray((response as any).data)
              ? (response as any).data
              : [];

          if (rolesData.length > 0) {
            const mappedRoles: RoleDef[] = await Promise.all(
              rolesData.map(async (r: any) => {
                let modules: ModuleId[] = [];
                
                // Intentar obtener permisos del rol
                try {
                  const roleWithPermisos = await apiClient.obtenerRol(r.id);
                  if (roleWithPermisos?.permisos) {
                    const permisos = Array.isArray(roleWithPermisos.permisos) 
                      ? roleWithPermisos.permisos 
                      : [];
                    // Mapear permisos a módulos (permiso.modulo = 'dashboard', 'mesas', etc)
                    modules = permisos
                      .map((p: any) => p.modulo || p.module)
                      .filter((m: any) => m && ALL_MODULES.includes(m as ModuleId));
                  }
                } catch (err) {
                  console.warn(`No pudimos cargar permisos para rol ${r.id}`, err);
                }
                
                // Si no hay permisos mapeados, usar valores por defecto según el tipo de rol
                if (modules.length === 0) {
                  const roleName = String(r.nombre_rol || "").toLowerCase();
                  if (roleName.includes("admin") || roleName.includes("gerente")) {
                    modules = [...ALL_MODULES];
                  } else if (roleName.includes("mesero")) {
                    modules = ["mesas"];
                  } else if (roleName.includes("cocina") || roleName.includes("cocinero")) {
                    modules = ["cocina"];
                  } else if (roleName.includes("caja") || roleName.includes("cajero")) {
                    modules = ["caja"];
                  }
                }
                
                return {
                  id: String(r.id),
                  label: r.nombre_rol,
                  modules,
                  system: String(r.nombre_rol || "").toLowerCase().includes("admin") ||
                          String(r.nombre_rol || "").toLowerCase().includes("sistema"),
                };
              })
            );
            set({ roles: mappedRoles });
          } else {
            set({ roles: DEFAULT_ROLES });
          }
        } catch (error) {
          console.error("Error loading roles:", error);
          set({ roles: DEFAULT_ROLES });
        }
      },
    }),
);

// Etiquetas amigables para módulos
export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  mesas: "Mesas",
  cocina: "Cocina",
  caja: "Caja",
  inventario: "Inventario",
  usuarios: "Usuarios",
  auditoria: "Auditoría",
};
