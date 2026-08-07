import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Clock, ArrowRight, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { formatCRC } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { apiClient } from "@/lib/api";

const statusMap: Record<string, { label: string; tone: string }> = {
  borrador: { label: "Borrador", tone: "bg-secondary text-secondary-foreground" },
  pendiente: { label: "En cocina", tone: "bg-warm/20 text-warm-foreground" },
  proceso: { label: "En cocina", tone: "bg-warm/20 text-warm-foreground" },
  listo: { label: "Listo", tone: "bg-success/15 text-success" },
  cobrado: { label: "Cobrado", tone: "bg-success/15 text-success" },
  cancelada: { label: "Anulada", tone: "bg-destructive/10 text-destructive" },
  cancelado: { label: "Anulada", tone: "bg-destructive/10 text-destructive" },
  cerrada: { label: "Cerrada", tone: "bg-secondary text-secondary-foreground" },
};

export default function CajeroOrdenes() {
  const orders = useStore((s) => s.orders);
  const hiddenOrderIds = useStore((s) => s.hiddenOrderIds);
  const apiLoadOrdersOpen = useStore((s) => s.apiLoadOrdersOpen);

  const normalizeOrderKey = (value: unknown) => String(value ?? "").trim().toLowerCase();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.getDashboardStats(),
  });

  useEffect(() => {
    void apiLoadOrdersOpen();
  }, [apiLoadOrdersOpen]);

  const activeOrders = useMemo(
    () => orders.filter((o) => {
      const normalizedHidden = new Set(hiddenOrderIds.map(normalizeOrderKey));
      const isHidden = normalizedHidden.has(normalizeOrderKey(o.id)) || normalizedHidden.has(normalizeOrderKey(o.code));
      return !isHidden && o.status !== "cobrado" && o.status !== "cancelado" && o.status !== "cancelada";
    }),
    [hiddenOrderIds, orders],
  );

  const total = activeOrders.reduce((s, o) => s + o.total, 0);
  return (
    <>
      <PageHeader
        title="Órdenes activas"
        subtitle={`${activeOrders.length} tickets abiertos`}
        home
        right={
          <button className="grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-card text-foreground shadow-soft transition hover:bg-secondary">
            <Filter className="h-4 w-4" />
          </button>
        }
      />

      <section className="px-4 mt-3 grid grid-cols-2 gap-2.5">
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Ventas hoy</p>
          {statsLoading ? (
            <div className="mt-2">
              <LoadingSpinner size="sm" variant="dots" />
            </div>
          ) : (
            <p className="font-display text-lg mt-1.5 leading-none">{formatCRC(stats?.ventas_hoy || 0)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-3.5 shadow-soft">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Por cobrar</p>
          <p className="font-display text-lg mt-1.5 leading-none">{formatCRC(total)}</p>
        </div>
      </section>

      <div className="px-4 mt-4 pb-6 space-y-2.5">
        {activeOrders.map((o) => (
          <div key={o.id} className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft">
            <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-primary to-amber-400" />
            <div className="p-3.5">
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-display text-lg leading-none">Mesa {o.tableNumber || "-"}</p>
                  <span className={cn("chip", statusMap[o.status]?.tone ?? statusMap.borrador.tone)}>
                    {statusMap[o.status]?.label ?? o.status}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">Ticket {o.code} · {o.clientName ?? o.clientType ?? "Sin cliente"}</p>
                <p className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" /> {Math.max(0, Math.round((Date.now() - new Date(o.createdAt).getTime()) / 60000))} min{(o.waiterName && String(o.waiterName).trim().toLowerCase() !== 'sin asignar' && String(o.waiterName).trim().toLowerCase() !== 'sistema') ? ` · Atendió ${o.waiterName}` : ''}
                </p>
              </div>
              <p className="font-display text-lg tabular-nums">{formatCRC(o.total)}</p>
            </div>
            <div className="mt-3">
              <Link
                to={`/cajero/cobrar/${o.code}`}
                className="w-full rounded-full bg-emerald-600 text-white py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors"
              >
                Cobrar <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
