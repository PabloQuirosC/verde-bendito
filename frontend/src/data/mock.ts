export type Role = "mesero" | "cocina" | "cajero" | "admin";

export const roleLabels: Record<Role, string> = {
  mesero: "Mesero",
  cocina: "Cocina",
  cajero: "Cajero",
  admin: "Administrador",
};

export type Category = "Todo" | "Desayunos" | "Platos fuertes" | "Bebidas" | "Postres";

export interface Product {
  id: string;
  name: string;
  price: number;
  category: Exclude<Category, "Todo">;
  popular?: boolean;
  emoji: string;
  allergens?: string[];
}

export const products: Product[] = [
  { id: "p1", name: "Gallo Pinto Especial", price: 4500, category: "Desayunos", popular: true, emoji: "🍳" },
  { id: "p2", name: "Casado de Pollo", price: 5500, category: "Platos fuertes", emoji: "🍛" },
  { id: "p3", name: "Ceviche de Corvina", price: 6200, category: "Platos fuertes", popular: true, emoji: "🐟", allergens: ["pescado"] },
  { id: "p4", name: "Café Chorreado", price: 1500, category: "Bebidas", emoji: "☕" },
  { id: "p5", name: "Batido de Frutas", price: 2200, category: "Bebidas", emoji: "🥤" },
  { id: "p6", name: "Tres Leches", price: 3000, category: "Postres", emoji: "🍰", allergens: ["lácteos", "gluten"] },
  { id: "p7", name: "Bowl de Acai", price: 4800, category: "Desayunos", popular: true, emoji: "🥣" },
  { id: "p8", name: "Tostada de Aguacate", price: 3900, category: "Desayunos", emoji: "🥑", allergens: ["gluten"] },
  { id: "p9", name: "Hamburguesa Verde", price: 6800, category: "Platos fuertes", emoji: "🍔", allergens: ["gluten"] },
  { id: "p10", name: "Jugo Verde Detox", price: 2800, category: "Bebidas", emoji: "🥬" },
  { id: "p11", name: "Papas Supremas", price: 2400, category: "Platos fuertes", emoji: "🍟" },
  { id: "p12", name: "Flan de Coco", price: 2900, category: "Postres", emoji: "🍮", allergens: ["lácteos"] },
];

export type TableStatus = "libre" | "ocupada" | "cuenta" | "limpieza";
export interface RestaurantTable {
  id: string;
  number: number;
  seats: number;
  status: TableStatus;
  total?: number;
  minutes?: number;
  zone: "Salón" | "Terraza" | "Barra";
}

export const tables: RestaurantTable[] = [
  { id: "t1", number: 1, seats: 4, status: "ocupada", total: 45200, minutes: 40, zone: "Salón" },
  { id: "t2", number: 2, seats: 2, status: "libre", zone: "Salón" },
  { id: "t3", number: 3, seats: 6, status: "cuenta", total: 38400, minutes: 65, zone: "Salón" },
  { id: "t4", number: 4, seats: 4, status: "ocupada", total: 19800, minutes: 12, zone: "Salón" },
  { id: "t5", number: 5, seats: 2, status: "libre", zone: "Terraza" },
  { id: "t6", number: 6, seats: 4, status: "limpieza", zone: "Terraza" },
  { id: "t7", number: 7, seats: 4, status: "ocupada", total: 19000, minutes: 120, zone: "Terraza" },
  { id: "t8", number: 8, seats: 4, status: "libre", zone: "Barra" },
  { id: "t9", number: 9, seats: 2, status: "ocupada", total: 8900, minutes: 6, zone: "Barra" },
  { id: "t10", number: 10, seats: 6, status: "libre", zone: "Salón" },
];

export type KitchenStatus = "pendiente" | "proceso" | "listo";
export interface KitchenItem {
  detailId?: number;
  qty: number;
  name: string;
  note?: string;
}
export interface KitchenOrder {
  id: string;
  comandaId?: number;
  table: string;
  status: KitchenStatus;
  minutes: number;
  priority: "alta" | "media" | "baja";
  items: KitchenItem[];
  allergens?: string[];
}

export const kitchenOrders: KitchenOrder[] = [
  {
    id: "101", table: "Mesa 4", status: "pendiente", minutes: 15, priority: "alta",
    items: [{ qty: 2, name: "Hamburguesa Verde", note: "Sin cebolla" }, { qty: 1, name: "Papas Supremas" }],
    allergens: ["gluten"],
  },
  {
    id: "102", table: "Mesa 12", status: "pendiente", minutes: 5, priority: "media",
    items: [{ qty: 1, name: "Bowl Bendito" }, { qty: 1, name: "Jugo de Maracuyá" }],
  },
  {
    id: "103", table: "Mesa 7", status: "proceso", minutes: 9, priority: "alta",
    items: [{ qty: 2, name: "Casado de Pollo" }, { qty: 2, name: "Café Chorreado" }],
  },
  {
    id: "104", table: "Mesa 1", status: "proceso", minutes: 14, priority: "media",
    items: [{ qty: 1, name: "Ceviche de Corvina" }], allergens: ["pescado"],
  },
  {
    id: "105", table: "Mesa 9", status: "listo", minutes: 2, priority: "baja",
    items: [{ qty: 1, name: "Batido de Frutas" }, { qty: 1, name: "Tres Leches" }],
  },
];

export interface ActiveOrder {
  id: string;
  table: string;
  client: string;
  waiter: string;
  minutes: number;
  total: number;
  status: "abierta" | "por-cobrar" | "en-cocina";
}

export const activeOrders: ActiveOrder[] = [
  { id: "T-1024", table: "Mesa 04", client: "Juan Pérez", waiter: "Carlos M.", minutes: 18, total: 45500, status: "por-cobrar" },
  { id: "T-1025", table: "Mesa 12", client: "Ana García", waiter: "Elena R.", minutes: 8, total: 12800, status: "en-cocina" },
  { id: "T-1026", table: "Mesa 08", client: "Roberto S.", waiter: "Carlos M.", minutes: 3, total: 22450, status: "abierta" },
  { id: "T-1027", table: "Para llevar", client: "María L.", waiter: "Mostrador", minutes: 13, total: 8900, status: "por-cobrar" },
];

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  current: number;
  target: number;
  unit: string;
  level: "ok" | "bajo" | "critico";
}

export const inventory: InventoryItem[] = [
  { id: "i1", name: "Tomate Cherry Orgánico", category: "Vegetales", current: 4, target: 25, unit: "kg", level: "critico" },
  { id: "i2", name: "Cerveza IPA Artesanal", category: "Bebidas", current: 18, target: 48, unit: "u", level: "bajo" },
  { id: "i3", name: "Aceite de Oliva Extra", category: "Abarrotes", current: 15, target: 10, unit: "L", level: "ok" },
  { id: "i4", name: "Pechuga de Pollo", category: "Proteínas", current: 2, target: 20, unit: "kg", level: "critico" },
  { id: "i5", name: "Harina de Trigo", category: "Abarrotes", current: 22, target: 30, unit: "kg", level: "bajo" },
  { id: "i6", name: "Aguacate Hass", category: "Vegetales", current: 5, target: 30, unit: "u", level: "critico" },
  { id: "i7", name: "Lomo de Res", category: "Proteínas", current: 12, target: 18, unit: "kg", level: "ok" },
  { id: "i8", name: "Café en Grano", category: "Abarrotes", current: 6, target: 20, unit: "kg", level: "bajo" },
  { id: "i9", name: "Limón Mesino", category: "Vegetales", current: 24, target: 25, unit: "kg", level: "ok" },
  { id: "i10", name: "Refresco Cola 600ml", category: "Bebidas", current: 9, target: 60, unit: "u", level: "critico" },
];

export interface Vendor {
  id: string;
  name: string;
  category: string;
  rating: number;
  po: string;
  status: "Pendiente" | "Recibido" | "Retrasado";
  delivery: string;
  items: number;
  total: number;
  note?: string;
}

export const vendors: Vendor[] = [
  { id: "v1", name: "Coca‑Cola FEMSA", category: "Bebidas", rating: 4.8, po: "PO-4482", status: "Pendiente", delivery: "Hoy, 2:00 PM", items: 12, total: 450000 },
  { id: "v2", name: "Distribuidora El Agro", category: "Vegetales", rating: 4.6, po: "PO-4480", status: "Recibido", delivery: "Ayer, 10:30 AM", items: 24, total: 820500 },
  { id: "v3", name: "Carnes Premium CR", category: "Proteínas", rating: 4.9, po: "PO-4485", status: "Retrasado", delivery: "Mañana, 8:00 AM", items: 8, total: 1200000, note: "Retraso en aduana por clima." },
  { id: "v4", name: "Panadería La Luz", category: "Insumos", rating: 5.0, po: "PO-4488", status: "Pendiente", delivery: "Hoy, 6:00 AM", items: 6, total: 180000 },
  { id: "v5", name: "Lácteos Monteverde", category: "Lácteos", rating: 4.7, po: "PO-4490", status: "Recibido", delivery: "Hoy, 7:00 AM", items: 14, total: 320000 },
  { id: "v6", name: "Pesquera Pacífico", category: "Mariscos", rating: 4.5, po: "PO-4491", status: "Pendiente", delivery: "Mañana, 5:30 AM", items: 5, total: 540000 },
  { id: "v7", name: "Frutas Tropicales SA", category: "Vegetales", rating: 4.4, po: "PO-4493", status: "Recibido", delivery: "Hoy, 9:15 AM", items: 18, total: 295000 },
  { id: "v8", name: "Insumos Eco‑Pack", category: "Empaques", rating: 4.3, po: "PO-4495", status: "Pendiente", delivery: "Hoy, 4:00 PM", items: 30, total: 210000 },
];

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username: string;
  roles: Role[];
  active: boolean;
  lastSeen: string;
}

export const systemUsers: SystemUser[] = [
  { id: "u1", name: "Carlos Mora", email: "carlos@verdebendito.cr", username: "cmora", roles: ["mesero"], active: true, lastSeen: "Hace 5 min" },
  { id: "u2", name: "Elena Rojas", email: "elena@verdebendito.cr", username: "erojas", roles: ["mesero", "cajero"], active: true, lastSeen: "Hace 12 min" },
  { id: "u3", name: "Pedro Núñez", email: "pedro@verdebendito.cr", username: "pnunez", roles: ["cocina"], active: true, lastSeen: "Hace 1 min" },
  { id: "u4", name: "Marta Solís", email: "marta@verdebendito.cr", username: "msolis", roles: ["cajero"], active: true, lastSeen: "Hoy, 9:42 AM" },
  { id: "u5", name: "Andrés Vega", email: "andres@verdebendito.cr", username: "avega", roles: ["admin"], active: true, lastSeen: "Hace 2 h" },
  { id: "u6", name: "Luisa Méndez", email: "luisa@verdebendito.cr", username: "lmendez", roles: ["mesero"], active: false, lastSeen: "Hace 3 días" },
  { id: "u7", name: "Jorge Castro", email: "jorge@verdebendito.cr", username: "jcastro", roles: ["cocina", "mesero"], active: true, lastSeen: "Hace 22 min" },
  { id: "u8", name: "Sofía Quirós", email: "sofia@verdebendito.cr", username: "squiros", roles: ["cajero", "admin"], active: true, lastSeen: "Hace 40 min" },
  { id: "u9", name: "Raúl Brenes", email: "raul@verdebendito.cr", username: "rbrenes", roles: ["mesero"], active: false, lastSeen: "Hace 1 semana" },
  { id: "u10", name: "Karla Ulate", email: "karla@verdebendito.cr", username: "kulate", roles: ["cocina"], active: true, lastSeen: "Hace 3 min" },
];

export type AuditSeverity = "info" | "warning" | "critical";
export interface AuditEvent {
  id: string;
  ts: string;
  user: string;
  type: string;
  detail: string;
  device: string;
  severity: AuditSeverity;
}

export const auditEvents: AuditEvent[] = [
  { id: "a1", ts: "10:42", user: "Carlos M.", type: "Comanda · Enviada a cocina", detail: "Ticket T-1024 · Mesa 04", device: "iPad · 192.168.1.24", severity: "info" },
  { id: "a2", ts: "10:38", user: "Pedro N.", type: "Cocina · Marcado listo", detail: "Pedido #105 · Mesa 9", device: "POS-K1", severity: "info" },
  { id: "a3", ts: "10:30", user: "Marta S.", type: "Cobro · SINPE", detail: "Ticket T-1018 · ₡ 23.400", device: "POS-C2", severity: "info" },
  { id: "a4", ts: "10:15", user: "Andrés V.", type: "Inventario · Ajuste manual", detail: "Tomate Cherry: 8 → 4 kg", device: "Web · Chrome", severity: "warning" },
  { id: "a5", ts: "09:58", user: "sistema", type: "Stock crítico", detail: "Pechuga de Pollo bajo umbral (2/20)", device: "Servicio", severity: "critical" },
  { id: "a6", ts: "09:40", user: "Andrés V.", type: "Usuarios · Editado", detail: "Luisa Méndez · activo → inactivo", device: "Web · Chrome", severity: "warning" },
  { id: "a7", ts: "09:12", user: "Elena R.", type: "Login", detail: "Inicio de sesión", device: "iPhone · 4G", severity: "info" },
  { id: "a8", ts: "08:55", user: "Sofía Q.", type: "Cobro · Tarjeta", detail: "Ticket T-1015 · ₡ 18.900", device: "POS-C1", severity: "info" },
  { id: "a9", ts: "08:40", user: "Karla U.", type: "Cocina · En proceso", detail: "Pedido #099 · Mesa 6", device: "POS-K2", severity: "info" },
  { id: "a10", ts: "08:22", user: "Andrés V.", type: "Inventario · Orden compra", detail: "PO-4495 · Insumos Eco-Pack", device: "Web · Chrome", severity: "info" },
  { id: "a11", ts: "08:05", user: "sistema", type: "Login fallido", detail: "Usuario 'jcastro' · 3 intentos", device: "iPad · 192.168.1.31", severity: "warning" },
  { id: "a12", ts: "07:55", user: "Carlos M.", type: "Comanda · Cancelada", detail: "Ticket T-1009 · Mesa 02", device: "iPad", severity: "warning" },
];

export const salesByHour = [
  { h: "08", v: 32 }, { h: "09", v: 58 }, { h: "10", v: 84 },
  { h: "11", v: 102 }, { h: "12", v: 168 }, { h: "13", v: 192 },
  { h: "14", v: 134 }, { h: "15", v: 76 }, { h: "16", v: 64 },
  { h: "17", v: 88 }, { h: "18", v: 122 }, { h: "19", v: 156 },
];

export const formatCRC = (n: number) =>
  "₡ " + n.toLocaleString("es-CR", { maximumFractionDigits: 0 });
