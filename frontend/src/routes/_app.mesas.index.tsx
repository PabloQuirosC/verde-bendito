import { useMemo, useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Users, Plus, Bell, Clock, CheckCircle2 } from "lucide-react";
import { useStore } from "@/store/useStore";
import { TableStatusBadge } from "@/components/StatusBadges";
import { Button } from "@/components/ui/button";
import { playWaiterNotification } from "@/hooks/useLiveSimulator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/mesas/")({
  component: MesasPage,
});

function MesasPage() {
  const tables = useStore((s) => s.tables);
  const orders = useStore((s) => s.orders);
  const createOrder = useStore((s) => s.createOrder);
  const navigate = useNavigate();
  const soundEnabled = useStore((s) => s.soundEnabled);
  const [zone, setZone] = useState<"Todas" | "Salón" | "Terraza" | "Barra">("Todas");
  const lastReadyCount = useRef(0);

  const zones = ["Todas", "Salón", "Terraza", "Barra"] as const;
  const readyOrders = orders.filter((o) => o.status === "listo");

  // Notificar al mesero cuando hay órdenes listas
  useEffect(() => {
    if (readyOrders.length > lastReadyCount.current && soundEnabled) {
      playWaiterNotification();
    }
    lastReadyCount.current = readyOrders.length;
  }, [readyOrders.length, soundEnabled]);

  const filtered = useMemo(
    () => tables.filter((t) => zone === "Todas" || t.zone === zone),
    [tables, zone],
  );

  const handleOpen = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    if (table.currentOrderId) {
      navigate({ to: "/mesas/$orderId", params: { orderId: table.currentOrderId } });
      return;
    }
    const order = createOrder(tableId);
    navigate({ to: "/mesas/$orderId", params: { orderId: order.id } });
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto">
      {readyOrders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-3 sm:p-4 rounded-lg bg-success/15 border border-success/30 flex items-center gap-2 sm:gap-3"
        >
          <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-success shrink-0 animate-bounce" />
          <div>
            <div className="font-semibold text-sm sm:text-base text-success">
              {readyOrders.length} platillo{readyOrders.length === 1 ? "" : "s"} listo{readyOrders.length === 1 ? "" : "s"} para recoger
            </div>
            <div className="text-xs text-success/80">
              {readyOrders.map((o) => `Mesa ${o.tableNumber}`).join(", ")}
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-3 sm:gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Mesas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Selecciona una mesa para abrir o continuar la orden.
          </p>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {zones.map((z) => (
            <button
              key={z}
              onClick={() => setZone(z)}
              className={cn(
                "px-2 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium border transition",
                zone === z
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {z}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
        {filtered.map((t, i) => {
          const order = orders.find((o) => o.id === t.currentOrderId);
          return (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleOpen(t.id)}
              className={cn(
                "pos-card p-3 sm:p-4 text-left flex flex-col gap-2 sm:gap-3 min-h-[130px] sm:min-h-[140px] relative overflow-hidden",
                t.status === "libre" && "border-success/40",
                t.status === "ocupada" && "border-warning/50",
                t.status === "proceso" && "border-info/50",
                t.status === "porCobrar" && "border-primary/60 ring-1 ring-primary/30",
                order?.status === "listo" && "ring-2 ring-success/60 bg-success/5",
                order?.status === "cobrado" && "ring-2 ring-success/50 bg-success/10 opacity-75",
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">{t.zone}</div>
                  <div className="font-display text-2xl sm:text-3xl leading-none">Mesa {t.number}</div>
                </div>
                <TableStatusBadge status={t.status} />
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> {t.capacity}
              </div>
              {order ? (
                <div className="mt-auto text-[10px] sm:text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1">
                    {order.code}
                    {order.status === "listo" && (
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success animate-pulse" />
                    )}
                    {order.status === "cobrado" && (
                      <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {order.items.reduce((s, i) => s + i.qty, 0)} ítems
                  </div>
                </div>
              ) : (
                <div className="mt-auto inline-flex items-center gap-1 text-[10px] sm:text-xs text-primary font-medium">
                  <Plus className="h-3 w-3" /> Abrir mesa
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      <Legend />
    </div>
  );
}

function Legend() {
  const items: { label: string; cls: string }[] = [
    { label: "Libre", cls: "bg-success/15 border-success/40" },
    { label: "Ocupada", cls: "bg-warning/20 border-warning/40" },
    { label: "En proceso", cls: "bg-info/15 border-info/40" },
    { label: "Por cobrar", cls: "bg-primary/15 border-primary/40" },
  ];
  return (
    <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 text-xs sm:text-sm text-muted-foreground">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm border", i.cls)} />
          {i.label}
        </div>
      ))}
    </div>
  );
}
