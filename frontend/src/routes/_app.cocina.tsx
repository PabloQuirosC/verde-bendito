import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ChefHat, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { formatTime } from "@/lib/format";
import useNotifications from "@/hooks/useNotifications";
import { playNotification } from "@/hooks/useLiveSimulator";
import type { OrderStatus } from "@/store/types";
import { cn } from "@/lib/utils";

type KitchenOrder = {
  id: string;
  comandaId?: number;
  table: string;
  status: OrderStatus;
  minutes: number;
  priority: "alta" | "media" | "baja";
  items: Array<{ id?: number; detailId?: number; qty: number; name: string; note?: string }>;
  allergens?: string[];
  updatedAt?: string;
};

export const Route = createFileRoute("/_app/cocina")({
  component: CocinaPage,
});

const COLUMNS: { status: OrderStatus; title: string; icon: React.ComponentType<{ className?: string }>; cls: string }[] = [
  { status: "pendiente", title: "Pendiente", icon: Clock, cls: "border-warning/50" },
  { status: "proceso", title: "En proceso", icon: ChefHat, cls: "border-info/50" },
  { status: "listo", title: "Listo", icon: CheckCircle2, cls: "border-success/50" },
];

function CocinaPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const lastPendingCount = useRef(0);
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      const res = await fetch(`${base}/comandas/cocina/ordenes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const sections: Array<[OrderStatus, any[]]> = [
        ["pendiente", data?.data?.pendiente ?? []],
        ["proceso", data?.data?.proceso ?? []],
        ["listo", data?.data?.listo ?? []],
      ];

      const mapped: KitchenOrder[] = sections.flatMap(([status, list]) =>
        list.map((item: any) => ({
          id: String(item.comanda_numero ?? item.comanda_id ?? item.id),
          comandaId: item.comanda_id,
          table: item.mesa,
          status,
          minutes: 0,
          priority: item.prioridad ?? "media",
          items: (item.items ?? [{ detailId: item.id, qty: item.cantidad, name: item.producto_nombre, note: item.notas }]).map((detail: any) => ({
            detailId: detail.detailId ?? detail.id,
            qty: detail.qty ?? detail.cantidad ?? 1,
            name: detail.name ?? detail.producto_nombre ?? "Pedido",
            note: detail.note ?? detail.notas,
          })),
          allergens: [],
          updatedAt: item.fecha_creacion ?? new Date().toISOString(),
        })),
      );

      setOrders(mapped);
    } catch (error) {
      console.error("Error loading kitchen orders:", error);
      toast.error("Error al cargar órdenes de cocina");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
    const interval = window.setInterval(() => void loadOrders(), 5000);
    return () => window.clearInterval(interval);
  }, [loadOrders]);

  useNotifications("cocina", () => {
    void loadOrders();
    if (soundRef.current) {
      playNotification();
    }
  });

  const pendingOrders = orders.filter((o) => o.status === "pendiente");

  useEffect(() => {
    if (pendingOrders.length > lastPendingCount.current && soundEnabled) {
      playNotification();
    }
    lastPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length, soundEnabled]);

  const next = (s: OrderStatus): OrderStatus | null => {
    if (s === "pendiente") return "proceso";
    if (s === "proceso") return "listo";
    return null;
  };

  const advance = (order: KitchenOrder) => {
    const nx = next(order.status);
    if (!nx) return;
    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: nx } : item)));
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Cocina</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Tablero de preparación · {orders.filter((o) => ["pendiente", "proceso"].includes(o.status)).length} órdenes activas
          </p>
        </div>
        {pendingOrders.length > 0 && (
          <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-warning/20 text-warning-foreground text-[10px] sm:text-xs font-bold pulse-ring">
            <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            {pendingOrders.length} nueva{pendingOrders.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end mb-3">
        <Button size="sm" variant="secondary" onClick={() => void loadOrders()} disabled={loading}>
          <Clock className="h-4 w-4 mr-2" />
          Refrescar
        </Button>
      </div>

      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 min-h-0">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.status);
          const Icon = col.icon;
          return (
            <div key={col.status} className={cn("flex flex-col rounded-xl border-2 bg-card/40 min-h-0", col.cls)}>
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b border-current/20">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                <h2 className="font-display text-base sm:text-lg lg:text-xl flex-1">{col.title}</h2>
                <span className="text-xs sm:text-sm font-bold text-muted-foreground bg-background px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              <div className="flex-1 overflow-auto p-2 sm:p-3 space-y-2 sm:space-y-3">
                <AnimatePresence>
                  {items.map((o) => {
                    const nx = next(col.status);
                    return (
                      <motion.div
                        layout
                        key={o.id}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-card rounded-lg shadow-sm border p-3 sm:p-4"
                      >
                        <div className="flex items-baseline justify-between mb-2">
                          <div>
                            <div className="font-display text-xl sm:text-2xl">Mesa {o.table}</div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">{o.id} · {formatTime(o.updatedAt ?? new Date().toISOString())}</div>
                          </div>
                        </div>
                        <ul className="space-y-1 mb-3">
                          {o.items.map((it) => (
                            <li key={it.detailId ?? it.id ?? `${o.id}-${it.name}`} className="flex items-baseline gap-2 text-sm sm:text-base">
                              <span className="font-bold text-primary w-5">{it.qty}×</span>
                              <span className="flex-1 leading-tight">{it.name}</span>
                              {it.note && <span className="text-xs text-warm-foreground italic">{it.note}</span>}
                            </li>
                          ))}
                        </ul>
                        {nx && (
                          <Button
                            className="w-full h-9 sm:h-11 text-xs sm:text-sm"
                            variant={col.status === "proceso" ? "default" : "secondary"}
                            onClick={() => advance(o)}
                          >
                            {col.status === "pendiente" ? "Comenzar a preparar" : "Marcar como listo"}
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {items.length === 0 && (
                  <div className="text-center text-[10px] sm:text-xs text-muted-foreground py-8 sm:py-12">Sin órdenes en esta etapa.</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}