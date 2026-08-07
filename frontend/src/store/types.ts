export type Role = string;

export const ALL_MODULES = [
  "dashboard",
  "mesas",
  "cocina",
  "caja",
  "inventario",
  "usuarios",
  "auditoria",
  "notificaciones",
] as const;

export type ModuleId = (typeof ALL_MODULES)[number];

export interface RoleDef {
  id: string;
  label: string;
  modules: ModuleId[];
  /** Roles del sistema no se pueden borrar */
  system?: boolean;
}

export type Category = string;

export interface CategoryDef {
  id: string;
  name: string;
  emoji: string;
}

export interface Product {
  id: string;
  name: string;
  category: Category;
  price: number;
  stock: number;
  minStock: number;
  active: boolean;
}

export type TableStatus = "libre" | "ocupada" | "proceso" | "porCobrar";

export interface RestaurantTable {
  id: string;
  number: number;
  zone: "Salón" | "Terraza" | "Barra";
  capacity: number;
  status: TableStatus;
  currentOrderId?: string;
}

export type OrderStatus =
  | "borrador"
  | "pendiente"
  | "proceso"
  | "listo"
  | "entregado"
  | "cobrado"
  | "cancelada"
  | "cancelado";

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  qty: number;
  notes?: string;
}

export type PaymentMethod = "efectivo" | "sinpe" | "tarjeta";

export interface Payment {
  method: PaymentMethod;
  amount: number;
  received?: number;
  change?: number;
  reference?: string;
}

export interface Order {
  id: string;
  code: string;
  tableId: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  clientName?: string;
  clientType?: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  subtotal: number;
  tax: number;
  total: number;
  payment?: Payment;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  username: string;
  password: string;
  role: Role;
  active: boolean;
  debe_cambiar_contraseña?: boolean;
}

export interface AuditLog {
  id: string;
  at: string;
  user: string;
  action: string;
  detail?: string;
  scope?: {
    entityType?: string;
    entityId?: string;
    tableId?: string;
  };
}
