import { Link } from "react-router-dom";
import { LogOut, Clock, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useSession } from "@/context/session";
import { apiClient } from "@/lib/api";
import { decodeJwtPayload } from "@/lib/jwt";
import { formatCRC } from "@/lib/format";
import { roleLabels } from "@/data/mock";
import { useEffect, useState } from "react";

type GraphItem = {
  label: string;
  value: number;
  tone: string;
  suffix?: string;
  kind?: "number" | "currency" | "percent";
};

function SummaryGraph({
  title,
  subtitle,
  items,
  loading,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: GraphItem[];
  loading: boolean;
  emptyText: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <section className="space-y-2">
      <div className="px-1">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-border bg-card p-4 shadow-soft space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground">Cargando resumen...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          items.map((item) => {
            const width = `${Math.max((item.value / max) * 100, item.value > 0 ? 10 : 0)}%`;
            return (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground tabular-nums">
                    {item.kind === "currency"
                      ? formatCRC(item.value)
                      : item.kind === "percent"
                        ? `${item.value.toFixed(2)}%`
                        : `${item.value}`}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width }} />
                </div>
                {item.suffix && <p className="text-[10px] text-muted-foreground">{item.suffix}</p>}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function Perfil() {
  const { role, hasPermission, hasRole } = useSession();
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mesas, setMesas] = useState<any[]>([]);
  const [mesasLoading, setMesasLoading] = useState(false);
  const [expandedMesa, setExpandedMesa] = useState<number | null>(null);
  const [kitchenSummary, setKitchenSummary] = useState<{ pedido: number; proceso: number; listo: number; items: number } | null>(null);
  const [kitchenLoading, setKitchenLoading] = useState(false);
  const [cashSummary, setCashSummary] = useState<{ ventas_totales: number; margen_dinero: number; margen_porcentaje: number } | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const canAccessMesas = hasPermission("acceder_mesas");
  const canSeeKitchen = role === "cocina" || hasRole("cocina") || role === "admin";
  const canSeeCash = role === "cajero" || hasRole("cajero") || role === "admin";

  // obtener user_id y token desde el JWT
  const savedToken = typeof window !== "undefined" ? sessionStorage.getItem("auth_token") : null;
  let userId: number | null = null;
  let tokenUsername = "Usuario";
  try {
    const payload = savedToken ? decodeJwtPayload(savedToken) : null;
    userId = payload?.user_id ? Number(payload.user_id) : null;
    tokenUsername = payload?.username || payload?.sub || "Usuario";
  } catch {
    userId = null;
  }

  useEffect(() => {
    if (!userId) return;
    const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
    const url = `${base}/usuarios/${userId}/perfil`;
    setLoading(true);
    setError(null);

    fetch(url, {
      headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`${res.status} ${txt}`);
        }
        return res.json();
      })
      .then((data) => setProfile(data))
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [userId, savedToken]);

  // cargar mesas ocupadas para dashboard
  useEffect(() => {
    if (!canAccessMesas) {
      setMesas([]);
      setMesasLoading(false);
      return;
    }

    const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
    const url = `${base}/mesas/ocupadas/dashboard`;
    setMesasLoading(true);

    fetch(url, {
      headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) return;
        return res.json();
      })
      .then((data) => {
        if (data?.data) setMesas(data.data);
      })
      .catch(() => {})
      .finally(() => setMesasLoading(false));
  }, [savedToken, canAccessMesas]);

  useEffect(() => {
    if (!canSeeKitchen) {
      setKitchenSummary(null);
      setKitchenLoading(false);
      return;
    }

    const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
    const url = `${base}/comandas/cocina/ordenes`;
    setKitchenLoading(true);

    fetch(url, {
      headers: savedToken ? { Authorization: `Bearer ${savedToken}` } : undefined,
    })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        const cocina = data?.data ?? data ?? {};
        const pedido = Array.isArray(cocina.pendiente) ? cocina.pendiente.length : 0;
        const proceso = Array.isArray(cocina.proceso) ? cocina.proceso.length : 0;
        const listo = Array.isArray(cocina.listo) ? cocina.listo.length : 0;
        const items = [...(cocina.pendiente ?? []), ...(cocina.proceso ?? []), ...(cocina.listo ?? [])].reduce(
          (total: number, orden: any) => total + Number(orden?.cantidad ?? orden?.items?.length ?? 0),
          0,
        );
        setKitchenSummary({ pedido, proceso, listo, items });
      })
      .catch(() => {
        setKitchenSummary(null);
      })
      .finally(() => setKitchenLoading(false));
  }, [savedToken, canSeeKitchen]);

  useEffect(() => {
    if (!canSeeCash) {
      setCashSummary(null);
      setCashLoading(false);
      return;
    }

    setCashLoading(true);
    apiClient.getDashboardStats()
      .then((data) => {
        const stats = data?.data ?? data ?? {};
        const total = Number(stats?.ventas_totales ?? 0);
        const margin = Number(stats?.margen_dinero ?? 0);
        const marginPct = Number(stats?.margen_porcentaje ?? 0);
        setCashSummary({ ventas_totales: total, margen_dinero: margin, margen_porcentaje: marginPct });
      })
      .catch(() => {
        setCashSummary(null);
      })
      .finally(() => setCashLoading(false));
  }, [canSeeCash]);

  const displayName = profile && profile.nombre 
    ? `${profile.nombre} ${profile.apellido || ""}`.trim() 
    : tokenUsername;

  return (
    <>
      <PageHeader title="Mi perfil" home />
      <div className="px-4 pb-8 space-y-4">
        <section className="rounded-2xl bg-gradient-deep text-surface-deep-foreground p-5 shadow-card">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 font-display text-xl">
              {(displayName || "U").slice(0, 2).toUpperCase()}
            </div>
            <div>
              <p className="font-display text-lg">{displayName}</p>
              <p className="text-xs text-white/70 mt-0.5 capitalize">{role ? roleLabels[role] : "—"} · {profile?.turno || "Turno"}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="font-display text-base">{loading ? "..." : (profile?.comandas_count ?? "—")}</p>
              <p className="text-[10px] text-white/65 mt-0.5">Comandas</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="font-display text-base">{loading ? "..." : (profile?.vendido ? `₡ ${profile.vendido}` : "—")}</p>
              <p className="text-[10px] text-white/65 mt-0.5">Vendido</p>
            </div>
            <div className="rounded-xl bg-white/10 p-2.5">
              <p className="font-display text-base inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {loading ? "..." : (profile?.turno_horas ?? "—")}</p>
              <p className="text-[10px] text-white/65 mt-0.5">Turno</p>
            </div>
          </div>
        </section>

        {canSeeKitchen && (kitchenLoading || kitchenSummary) && (
          <SummaryGraph
            title="Resumen de cocina"
            subtitle="Estado de las comandas en preparación"
            loading={kitchenLoading}
            emptyText="No hay pedidos activos en cocina"
            items={[
              { label: "Pendientes", value: kitchenSummary?.pedido ?? 0, tone: "bg-warning" },
              { label: "En proceso", value: kitchenSummary?.proceso ?? 0, tone: "bg-primary" },
              { label: "Listos", value: kitchenSummary?.listo ?? 0, tone: "bg-success" },
              { label: "Items totales", value: kitchenSummary?.items ?? 0, tone: "bg-cyan-500" },
            ]}
          />
        )}

        {canSeeCash && (cashLoading || cashSummary) && (
          <SummaryGraph
            title="Resumen de caja"
            subtitle="Ventas y margen del periodo"
            loading={cashLoading}
            emptyText="No hay datos de caja para mostrar"
            items={[
              { label: "Ventas totales", value: cashSummary?.ventas_totales ?? 0, tone: "bg-emerald-500", suffix: "Monto acumulado", kind: "currency" },
              { label: "Margen de dinero", value: cashSummary?.margen_dinero ?? 0, tone: "bg-primary", suffix: "Ganancia estimada", kind: "currency" },
              { label: "Margen %", value: cashSummary?.margen_porcentaje ?? 0, tone: "bg-amber-500", suffix: "Rentabilidad", kind: "percent" },
            ]}
          />
        )}

        {/* Dashboard de mesas ocupadas - Acordeón */}
        {canAccessMesas && (mesasLoading ? (
          <section className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-soft">
            Cargando mesas ocupadas...
          </section>
        ) : mesas.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-foreground px-1">Mesas Ocupadas ({mesas.length})</h3>
            <div className="space-y-2">
              {mesas.map((mesa) => {
                const isExpanded = expandedMesa === mesa.id;
                const maxTotal = Math.max(...mesas.map(m => m.total), 1);
                const percentage = (mesa.total / maxTotal) * 100;
                return (
                  <div key={mesa.id} className="rounded-lg bg-card border border-primary/20 shadow-soft overflow-hidden">
                    {/* Header del acordeón */}
                    <button
                      onClick={() => setExpandedMesa(isExpanded ? null : mesa.id)}
                      className="w-full flex items-center justify-between p-3 hover:bg-secondary/10 transition"
                    >
                      <div className="flex items-center gap-3 flex-1 text-left">
                        <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary text-xs font-bold">{mesa.numero}</div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold">Mesa {mesa.numero}</p>
                          <p className="text-xs text-muted-foreground">{mesa.items_count} {mesa.items_count === 1 ? 'item' : 'items'} · {mesa.tiempo_abierta ? `${Math.floor(mesa.tiempo_abierta)}m` : '0m'}</p>
                        </div>
                        <p className="text-lg font-bold text-primary shrink-0">₡ {Number(mesa.total).toLocaleString('es-CR')}</p>
                      </div>
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Barra de progreso bajo el header */}
                    <div className="h-1 bg-muted">
                      <div className="h-full bg-gradient-to-r from-primary to-primary/70" style={{width: `${percentage}%`}} />
                    </div>

                    {/* Contenido expandido */}
                    {isExpanded && (
                      <div className="p-3 space-y-3 border-t border-primary/10">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-muted/40 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Items</p>
                            <p className="text-lg font-semibold">{mesa.items_count}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Tiempo</p>
                            <p className="text-lg font-semibold">{mesa.tiempo_abierta ? `${Math.floor(mesa.tiempo_abierta)}m` : '0m'}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Comanda</p>
                            <p className="text-sm font-mono">{mesa.comanda_numero || '-'}</p>
                          </div>
                          <div className="bg-muted/40 rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Capacidad</p>
                            <p className="text-lg font-semibold">{mesa.capacidad || '-'}</p>
                          </div>
                        </div>
                        <Link to={`/mesero/comanda/${mesa.id}`} className="w-full rounded-lg bg-primary text-primary-foreground py-2 px-3 text-center text-sm font-medium hover:bg-primary/90 transition">
                          Gestionar Mesa
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        <Link to="/" className="w-full flex items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive py-3 text-sm font-medium hover:bg-destructive/10">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </Link>

        {error && <div className="text-sm text-destructive">Error cargando perfil: {error}</div>}
      </div>
    </>
  );
}
