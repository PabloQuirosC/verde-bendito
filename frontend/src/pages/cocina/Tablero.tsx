import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, AlertTriangle, ChefHat, CheckCircle2, Play, Volume2, VolumeX, Bell, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { type KitchenOrder, type KitchenStatus } from "@/data/mock";
import { cn } from "@/lib/utils";
import { playAlert } from "@/lib/sound";
import useNotifications from "@/hooks/useNotifications";

const columns: Array<{ id: KitchenStatus; title: string; tone: string; icon: typeof ChefHat }> = [
  { id: "pendiente", title: "Pendiente", tone: "bg-warm/15 text-warm-foreground", icon: Clock },
  { id: "proceso",   title: "En proceso", tone: "bg-primary/10 text-primary", icon: ChefHat },
  { id: "listo",     title: "Listo",     tone: "bg-success/15 text-success", icon: CheckCircle2 },
];

const priorityTone: Record<string, string> = {
  alta: "bg-destructive/15 text-destructive border-destructive/30",
  media: "bg-warm/20 text-warm-foreground border-warm/30",
  baja: "bg-secondary text-muted-foreground border-border",
};

export default function CocinaTablero() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [activeCol, setActiveCol] = useState<KitchenStatus>("pendiente");
  const [soundOn, setSoundOn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stockAlert, setStockAlert] = useState<any | null>(null);
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  const handleKitchenMessage = useCallback((msg: any) => {
    const type = msg?.payload?.type;
    // Siempre recargar órdenes cuando llega cualquier notificación de cocina
    void loadOrdenes();

    // Reproducir sonido cuando llega un nuevo item/pedido pendiente
    if (type === "nuevo_item" && soundRef.current) {
      playAlert(6);
    }

    // Mostrar modal si hay alerta de stock
    if (type === "stock_bajo" || type === "stock_agotado") {
      setStockAlert(msg.payload);
    }
  }, []);

  useNotifications("cocina", handleKitchenMessage);

  // Cargar órdenes del backend
  const loadOrdenes = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      const res = await fetch(`${base}/comandas/cocina/ordenes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      
      if (!res.ok) {
        console.error("Error fetching orders:", res.status);
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        const sections: Array<[KitchenStatus, any[]]> = [
          ["pendiente", data.data.pendiente ?? []],
          ["proceso", data.data.proceso ?? []],
          ["listo", data.data.listo ?? []],
        ];

        const mapped = sections.flatMap(([status, list]) =>
          list.map((item: any) => ({
            id: String(item.comanda_numero ?? item.comanda_id ?? item.id),
            comandaId: item.comanda_id,
            table: item.mesa,
            status,
            minutes: 0,
            priority: item.prioridad ?? "media",
            items: (item.items ?? [{
              detailId: item.id,
              qty: item.cantidad,
              name: item.producto_nombre,
              note: item.notas,
            }]).map((detail: any) => ({
              detailId: detail.detailId ?? detail.id,
              qty: detail.qty ?? detail.cantidad ?? 1,
              name: detail.name ?? detail.producto_nombre ?? "Pedido",
              note: detail.note ?? detail.notas,
            })),
            allergens: [],
          }))
        );

        setOrders(mapped);
      }
    } catch (err) {
      console.error("Error loading orders:", err);
      toast.error("Error al cargar órdenes");
    } finally {
      setLoading(false);
    }
  };

  // Cargar órdenes al montar
  useEffect(() => {
    loadOrdenes();
    // Recargar cada 5 segundos
    const interval = setInterval(loadOrdenes, 5000);
    return () => clearInterval(interval);
  }, []);

  const advance = async (order: KitchenOrder) => {
    if (!order.comandaId) {
      toast.error("No se pudo identificar la comanda");
      return;
    }

    try {
      const token = sessionStorage.getItem("auth_token");
      const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      let res;
      if (order.status === "pendiente") {
        // Marcar solo el primer detalle como en proceso
        const firstDetail = order.items && order.items.length > 0 ? order.items[0].detailId : null;
        if (!firstDetail) {
          toast.error("No hay detalles para procesar");
          return;
        }
        const endpoint = `${base}/comandas/${order.comandaId}/items/${firstDetail}/proceso`;
        res = await fetch(endpoint, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
      } else {
        // Marcar solo el detalle que está en proceso como "listo"
        const firstDetail = order.items && order.items.length > 0 ? order.items[0].detailId : null;
        if (!firstDetail) {
          toast.error("No se pudo identificar el detalle a marcar como listo");
          return;
        }
        const endpoint = `${base}/comandas/${order.comandaId}/items/${firstDetail}/listo`;
        res = await fetch(endpoint, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (order.status === "pendiente") {
        toast(`Empezó pedido #${order.id}`, { description: order.table });
      } else {
        toast.success(`Pedido #${order.id} listo`, { description: `Avisar al mesero · ${order.table}` });
      }

      await loadOrdenes();
    } catch (error) {
      console.error("Error advancing order:", error);
      toast.error("No se pudo actualizar la comanda");
    }
  };

  return (
    <>
      <PageHeader
        title="Cocina"
        subtitle={`${orders.filter(o => o.status === "pendiente").length} pendientes · ${orders.filter(o => o.status === "proceso").length} cocinando`}
        home
        right={
          <div className="flex items-center gap-1.5">
            <button
              onClick={loadOrdenes}
              disabled={loading}
              className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-foreground shadow-soft hover:bg-secondary disabled:opacity-50"
              title="Recargar órdenes"
              aria-label="Recargar"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
            <button
              onClick={async () => {
                // Si estamos activando, intentar desbloquear audio
                if (!soundOn) {
                  try {
                    const mod = await import("@/lib/sound");
                    await mod.unlockSound();
                  } catch (e) {
                    console.warn("No se pudo desbloquear el sonido:", e);
                  }
                }
                setSoundOn((v) => !v);
              }}
                className="grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-card text-foreground shadow-soft hover:bg-secondary"
              title={soundOn ? "Sonido activo" : "Sonido silenciado"}
              aria-label="Sonido"
            >
              {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </button>
          </div>
        }
      />

      {/* Mobile column tabs */}
      <div className="lg:hidden px-4 mt-3">
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-secondary">
          {columns.map((c) => {
            const count = orders.filter((o) => o.status === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCol(c.id)}
                className={cn(
                  "py-2 rounded-xl text-xs font-medium transition",
                  activeCol === c.id ? "bg-card shadow-soft" : "text-muted-foreground"
                )}
              >
                {c.title} · {count}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile single column / Desktop kanban */}
      <div className="px-4 mt-4 pb-6 lg:grid lg:grid-cols-3 lg:gap-4">
        {loading && orders.length === 0 ? (
          <div className="lg:col-span-3 rounded-2xl border border-border/60 bg-card p-12">
            <LoadingSpinner size="md" variant="spin" text="Cargando ordenes de cocina..." />
          </div>
        ) : null}
        {loading && orders.length === 0 ? null : columns.map((c) => {
          const list = orders.filter((o) => o.status === c.id);
          const visible = activeCol === c.id;
          const Icon = c.icon;
          return (
            <section key={c.id} className={cn("space-y-3", !visible && "hidden lg:block")}>
              <div className="hidden lg:flex items-center gap-2">
                <span className={cn("chip", c.tone)}>
                  <Icon className="h-3.5 w-3.5" /> {c.title}
                </span>
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              {list.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                  Sin pedidos
                </div>
              )}
              {list.map((o) => (
                <article key={o.id} className="rounded-2xl bg-card border border-border/60 shadow-card p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Pedido #{o.id}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="font-display text-lg leading-tight">{o.table}</p>
                        {o.status === "pendiente" && <span className="chip text-[10px] bg-success/20 text-success border-success/30">Ocupada</span>}
                      </div>
                    </div>
                    <span className={cn("chip border", priorityTone[o.priority])}>
                      {o.priority === "alta" && <AlertTriangle className="h-3 w-3" />}
                      {o.priority}
                    </span>
                  </div>
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {o.minutes} min desde envío
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {o.items.map((it, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold">{it.qty}</span>
                        <div className="flex-1">
                          <p className="leading-tight">{it.name}</p>
                          {it.note && <p className="text-xs text-warm-foreground italic mt-0.5">↳ {it.note}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {o.allergens && o.allergens.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {o.allergens.map((a) => (
                        <span key={a} className="chip bg-destructive/10 text-destructive text-[10px] uppercase">⚠ {a}</span>
                      ))}
                    </div>
                  )}
                  {o.status !== "listo" && (
                    <button
                      onClick={() => void advance(o)}
                      className={cn(
                        "mt-4 w-full rounded-xl py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-2 transition",
                        o.status === "pendiente"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-success text-success-foreground hover:bg-success/90"
                      )}
                    >
                      {o.status === "pendiente" ? <><Play className="h-4 w-4" /> Empezar a cocinar</> : <><CheckCircle2 className="h-4 w-4" /> Marcar listo</>}
                    </button>
                  )}
                  {o.status === "listo" && (
                    <p className="mt-4 text-center text-xs text-success font-medium">✓ Avisado al mesero</p>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>
      {/* Stock alert modal */}
      {stockAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 w-[90%] max-w-md">
            <h3 className="text-lg font-semibold mb-2">{stockAlert.title || 'Alerta de inventario'}</h3>
            <p className="text-sm text-muted-foreground mb-4">{stockAlert.desc}</p>
            <p className="text-sm">Producto: <strong>{stockAlert.producto_nombre}</strong></p>
            <p className="text-sm">Stock actual: <strong>{stockAlert.stock}</strong></p>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setStockAlert(null)}
                className="px-4 py-2 rounded-lg bg-primary text-white"
              >Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
