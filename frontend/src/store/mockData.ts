import type { Product, RestaurantTable, User } from "./types";

export const initialProducts: Product[] = [
  { id: "p1", name: "Ceviche de pescado", category: "entradas", price: 4500, stock: 18, minStock: 5, active: true },
  { id: "p2", name: "Yuca frita", category: "entradas", price: 2800, stock: 30, minStock: 8, active: true },
  { id: "p3", name: "Patacones", category: "entradas", price: 3200, stock: 25, minStock: 6, active: true },
  { id: "p4", name: "Casado típico", category: "principales", price: 6500, stock: 22, minStock: 5, active: true },
  { id: "p5", name: "Arroz con pollo", category: "principales", price: 5800, stock: 20, minStock: 5, active: true },
  { id: "p6", name: "Lomo a la plancha", category: "principales", price: 8900, stock: 12, minStock: 4, active: true },
  { id: "p7", name: "Pescado entero", category: "principales", price: 9500, stock: 8, minStock: 3, active: true },
  { id: "p8", name: "Chifrijo", category: "principales", price: 5200, stock: 15, minStock: 4, active: true },
  { id: "p9", name: "Agua dulce", category: "bebidas", price: 1500, stock: 40, minStock: 10, active: true },
  { id: "p10", name: "Refresco natural", category: "bebidas", price: 1800, stock: 35, minStock: 10, active: true },
  { id: "p11", name: "Cerveza Imperial", category: "bebidas", price: 2200, stock: 60, minStock: 15, active: true },
  { id: "p12", name: "Vino tinto copa", category: "bebidas", price: 3500, stock: 18, minStock: 5, active: true },
  { id: "p13", name: "Tres leches", category: "postres", price: 2800, stock: 12, minStock: 3, active: true },
  { id: "p14", name: "Flan de coco", category: "postres", price: 2500, stock: 10, minStock: 3, active: true },
  { id: "p15", name: "Café chorreado", category: "cafeteria", price: 1200, stock: 50, minStock: 10, active: true },
  { id: "p16", name: "Cappuccino", category: "cafeteria", price: 1800, stock: 45, minStock: 10, active: true },
];

export const initialTables: RestaurantTable[] = [
  { id: "t1", number: 1, zone: "Salón", capacity: 2, status: "libre" },
  { id: "t2", number: 2, zone: "Salón", capacity: 4, status: "libre" },
  { id: "t3", number: 3, zone: "Salón", capacity: 4, status: "libre" },
  { id: "t4", number: 4, zone: "Salón", capacity: 6, status: "libre" },
  { id: "t5", number: 5, zone: "Terraza", capacity: 2, status: "libre" },
  { id: "t6", number: 6, zone: "Terraza", capacity: 4, status: "libre" },
  { id: "t7", number: 7, zone: "Terraza", capacity: 4, status: "libre" },
  { id: "t8", number: 8, zone: "Terraza", capacity: 8, status: "libre" },
  { id: "t9", number: 9, zone: "Barra", capacity: 1, status: "libre" },
  { id: "t10", number: 10, zone: "Barra", capacity: 1, status: "libre" },
  { id: "t11", number: 11, zone: "Barra", capacity: 1, status: "libre" },
  { id: "t12", number: 12, zone: "Barra", capacity: 1, status: "libre" },
];

export const initialUsers: User[] = [
  { id: "u1", name: "Ana Mora", username: "ana", password: "ana123", role: "mesero", active: true },
  { id: "u2", name: "Luis Vargas", username: "luis", password: "luis123", role: "mesero", active: true },
  { id: "u3", name: "Chef Carlos", username: "carlos", password: "carlos123", role: "cocina", active: true },
  { id: "u4", name: "María Cajas", username: "maria", password: "maria123", role: "cajero", active: true },
  { id: "u5", name: "Don Rafael", username: "admin", password: "admin123", role: "admin", active: true },
];
