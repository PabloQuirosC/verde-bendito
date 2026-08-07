import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, Receipt } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { formatCRC } from "@/data/mock";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";

type OrderStatus = "abierta" | "cocina" | "lista" | "pagada" | "cancelada";

interface MeseroOrder {
  id: string;
  code: string;
  tableId: string;
  tableLabel: string;
  clientLabel?: string;
  waiterLabel: string;
  minutes: number;
  total: number;
  status: OrderStatus;
}

const statusMap: Record<string, { label: string; tone: string }> = {
  abierta: { label: "Abierta", tone: "bg-secondary text-secondary-foreground" },
  cocina: { label: "En cocina", tone: "bg-warm/20 text-warm-foreground" },
  lista: { label: "Lista", tone: "bg-primary/10 text-primary" },
  pagada: { label: "Pagada", tone: "bg-success/15 text-success" },
  cancelada: { label: "Cancelada", tone: "bg-destructive/10 text-destructive" },
};

export default function MeseroOrdenes() {
  const orders = useStore((s) => s.orders);
  const tables = useStore((s) => s.tables);
  const currentUserName = useStore((s) => s.currentUserName);
  const loadTables = useStore((s) => s.loadTables);
  const apiLoadOrdersOpen = useStore((s) => s.apiLoadOrdersOpen);

  useEffect(() => {
    void loadTables();
    void apiLoadOrdersOpen();
  }, [apiLoadOrdersOpen, loadTables]);

  const openOrders = useMemo<MeseroOrder[]>(() => {
    return orders
      .filter((order) => order.status === "borrador" || order.status === "pendiente" || order.status === "proceso" || order.status === "listo")
      .filter((order) => !(order.status === "borrador" && Number(order.total) <= 0))
      .map((order) => {
        const table = tables.find((t) => t.id === order.tableId);
        const createdAt = new Date(order.createdAt);
        const minutes = Number.isNaN(createdAt.getTime())
          ? 0
          : Math.max(1, Math.round((Date.now() - createdAt.getTime()) / 60000));

        return {
          id: order.id,
          code: order.code,
          tableId: order.tableId,
          tableLabel: table ? `Mesa ${table.number}` : `Mesa ${order.tableNumber || "-"}`,
          clientLabel: order.clientName || (order.clientType === "delivery" ? "Delivery" : order.clientType === "para_llevar" ? "Para llevar" : undefined),
          waiterLabel: (!order.waiterName || order.waiterName === "Sistema") ? (currentUserName || "Mesero") : order.waiterName,
          minutes,
          total: order.total,
          status: order.status === "listo" ? "lista" : order.status === "proceso" ? "cocina" : order.status === "pendiente" ? "cocina" : "abierta",
        };
      });
  }, [orders, tables, currentUserName]);

  const total = openOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <>
      <PageHeader title="Mis comandas" subtitle="Turno mañana · Carlos M." home />
      <section className="px-4 mt-2 grid grid-cols-2 gap-2">
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comandas activas</p>
          <p className="font-display text-xl mt-1">{openOrders.length}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total abierto</p>
          <p className="font-display text-xl mt-1">{formatCRC(total)}</p>
        </div>
      </section>

      <div className="px-4 pb-6 space-y-2.5">
        {openOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
            No hay comandas activas.
          </div>
        )}
        {openOrders.map((o) => (
          <Link
            key={o.id}
            to={`/mesero/comanda/${o.tableId}`}
            className="block rounded-2xl bg-card p-4 border border-border/60 shadow-soft active:scale-[0.99] transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg leading-none">{o.code || o.tableLabel}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{o.clientLabel ? `${o.tableLabel} · ${o.clientLabel}` : o.tableLabel}</p>
              </div>
              <span className={cn("chip", statusMap[o.status].tone)}>{statusMap[o.status].label}</span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {o.minutes} min
              </span>
              <span className="font-display text-base inline-flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                {formatCRC(o.total)}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Atendió {o.waiterLabel}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
