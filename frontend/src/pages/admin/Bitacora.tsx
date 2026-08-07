import { useEffect, useMemo, useState } from "react";
import { Search, Download, FileText, Calendar, ChevronRight, Smartphone, Server } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import apiClient from "@/lib/api";
import { type AuditSeverity } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { usePagination } from "@/hooks/use-pagination";
import { Pager } from "@/components/Pager";

const severityTone: Record<AuditSeverity, string> = {
  info: "bg-secondary text-secondary-foreground",
  warning: "bg-warm/20 text-warm-foreground",
  critical: "bg-destructive/15 text-destructive",
};

export default function AdminBitacora() {
  const [types, setTypes] = useState<string[]>(["Todos"]);
  const [type, setType] = useState("Todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (mounted) setLoading(true);
      try {
        const res = await apiClient.getAuditoria?.();
        const items = res?.items ?? [];
        if (mounted) setList(items);
      } catch (e) {
        // fallback to empty list
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    // Cargar filtros dinámicos desde backend
    (async () => {
      try {
        const r = await apiClient.getAuditoriaTypes();
        const t = r?.types ?? null;
        if (mounted && Array.isArray(t) && t.length > 0) setTypes(["Todos", ...t]);
      } catch (err) {
        // ignore and keep defaults
      }
    })();
    return () => { mounted = false };
  }, []);

  const visibleTypes = useMemo(() => {
    const seen = new Set<string>(["Todos"]);
    for (const t of types) {
      if (t) seen.add(t);
    }
    for (const item of list) {
      const label = String(item?.type ?? "").trim();
      if (label) seen.add(label);
    }
    return Array.from(seen);
  }, [types, list]);

  const filtered = useMemo(
    () =>
      list.filter((e) => {
        if (type !== "Todos" && !String(e.type ?? "").toLowerCase().includes(type.toLowerCase())) return false;
        const haystack = `${String(e.detail ?? "")} ${String(e.user ?? "")} ${String(e.type ?? "")}`.toLowerCase();
        if (q && !haystack.includes(q.toLowerCase())) return false;
        return true;
      }),
    [type, q, list]
  );
  const { page, setPage, totalPages, pageItems, next, prev } = usePagination(filtered, 4);

  const parseAuditDate = (value?: string | null) => {
    if (!value) return null;

    const text = String(value).trim();
    if (!text) return null;

    const hasTimezone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(text);
    const normalized = !hasTimezone && text.includes("T") ? `${text}Z` : text;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  };

  const formatDateTime = (value?: string | null) => {
    const date = parseAuditDate(value);
    if (!date) return value || "";

    return date.toLocaleString("es-CR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <>
      <PageHeader
        title="Bitácora de auditoría"
        subtitle="Retención: 12 meses"
        home
        right={
          <div className="flex items-center gap-1">
            <button onClick={() => toast("Exportando CSV…")} className="grid h-9 w-9 place-items-center rounded-full bg-secondary" aria-label="Exportar CSV">
              <Download className="h-4 w-4" />
            </button>
            <button onClick={() => toast("Exportando PDF…")} className="grid h-9 w-9 place-items-center rounded-full bg-secondary" aria-label="Exportar PDF">
              <FileText className="h-4 w-4" />
            </button>
          </div>
        }
      />

      <div className="px-4 lg:px-6 pt-4 pb-8 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <button className="rounded-xl bg-card border border-border p-3 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Desde</p>
            <p className="text-sm font-medium mt-0.5 inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> 24 abr 2026</p>
          </button>
          <button className="rounded-xl bg-card border border-border p-3 text-left">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hasta</p>
            <p className="text-sm font-medium mt-0.5 inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> 25 abr 2026</p>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar usuario, evento, ticket..."
            className="w-full h-11 rounded-xl bg-secondary border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="scroll-x">
          {visibleTypes.map((t) => (
            <button key={t} onClick={() => setType(t)} className={cn("chip", type === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl bg-card border border-border/60 shadow-soft overflow-hidden">
          {loading ? (
            <div className="py-14 flex justify-center">
              <LoadingSpinner size="md" variant="spin" text="Cargando bitacora..." />
            </div>
          ) : (
          <ul className="divide-y divide-border">
            {pageItems.map((e) => {
              const isOpen = open === e.id;
              const displayUser = (() => {
                const candidates = [e.user, e.nombre_usuario, e.usuario_nombre, e.username];

                for (const candidate of candidates) {
                  if (candidate !== null && candidate !== undefined && String(candidate).trim()) {
                    return String(candidate).trim();
                  }
                }

                // Try to extract from after/before payloads if present
                const after = e.after ?? {};
                const before = e.before ?? {};
                if (after && typeof after === 'object') {
                  if (after.usuario) return String(after.usuario);
                  if (after.usuario_nombre) return String(after.usuario_nombre);
                  if (after.nombre_usuario) return String(after.nombre_usuario);
                  if (after.user) return String(after.user);
                }
                if (before && typeof before === 'object') {
                  if (before.usuario) return String(before.usuario);
                  if (before.usuario_nombre) return String(before.usuario_nombre);
                  if (before.nombre_usuario) return String(before.nombre_usuario);
                  if (before.user) return String(before.user);
                }
                if (e.usuario_id) return `Usuario #${e.usuario_id}`;
                return "Usuario desconocido";
              })();
              const { displayIP, displayUA } = (() => {
                // Prefer explicit top-level fields if present
                if (e.navegador) {
                  const browser = String(e.navegador).trim();
                  if (browser) {
                    return { displayIP: e.ip_usuario ? String(e.ip_usuario) : "", displayUA: browser };
                  }
                }

                if (e.ip_usuario && !e.device) {
                  const ipValue = String(e.ip_usuario).trim();
                  if (ipValue) {
                    return { displayIP: ipValue, displayUA: "" };
                  }
                }

                // Prefer top-level device if present
                const after = e.after ?? {};
                const before = e.before ?? {};

                const isIP = (s: string) => {
                  if (!s || typeof s !== 'string') return false;
                  const ipv4 = /(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.|$)){4}/;
                  const ipv6 = /([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}/;
                  return ipv4.test(s) || ipv6.test(s);
                };

                const pickFrom = (obj: any) => {
                  if (!obj || typeof obj !== 'object') return { ip: null, ua: null };
                  const ip = obj.ip_usuario ?? obj.ip ?? obj.ip_address ?? obj.remote_addr ?? null;
                  const ua = obj.navegador ?? obj.userAgent ?? obj.ua ?? obj.browser ?? null;
                  return { ip: ip ?? null, ua: ua ?? null };
                };

                // check top-level device first
                if (e.device) {
                  // if top-level looks like ip, return as ip; otherwise as ua/raw
                  if (isIP(String(e.device))) return { displayIP: String(e.device), displayUA: "" };
                  return { displayIP: "", displayUA: String(e.device) };
                }

                const a = pickFrom(after);
                if (a.ip) return { displayIP: String(a.ip), displayUA: a.ua ? String(a.ua) : "" };
                if (a.ua) return { displayIP: "", displayUA: String(a.ua) };
                const b = pickFrom(before);
                if (b.ip) return { displayIP: String(b.ip), displayUA: b.ua ? String(b.ua) : "" };
                if (b.ua) return { displayIP: "", displayUA: String(b.ua) };

                const searchObj = (obj: any): { ip?: string; ua?: string } => {
                  if (!obj) return {};
                  if (typeof obj === 'string') {
                    if (isIP(obj)) return { ip: obj };
                    if (obj.includes('Mozilla') || obj.includes('Chrome') || obj.includes('Safari')) return { ua: obj };
                    return {};
                  }
                  if (typeof obj !== 'object') return {};
                  for (const k of Object.keys(obj)) {
                    const v = obj[k];
                    if (!v && v !== 0) continue;
                    try {
                      if (typeof v === 'string') {
                        if (isIP(v)) return { ip: v };
                        if (v.includes('Mozilla') || v.includes('Chrome') || v.includes('Safari')) return { ua: v };
                      } else if (typeof v === 'object') {
                        const found = searchObj(v);
                        if (found.ip || found.ua) return found;
                      }
                    } catch (err) {
                      continue;
                    }
                  }
                  return {};
                };

                const fa = searchObj(after);
                if (fa.ip) return { displayIP: fa.ip, displayUA: fa.ua ?? "" };
                if (fa.ua) return { displayIP: "", displayUA: fa.ua };
                const fb = searchObj(before);
                if (fb.ip) return { displayIP: fb.ip, displayUA: fb.ua ?? "" };
                if (fb.ua) return { displayIP: "", displayUA: fb.ua };

                return { displayIP: "", displayUA: "" };
              })();
              return (
                <li key={e.id}>
                  <button onClick={() => setOpen(isOpen ? null : e.id)} className="w-full text-left p-4 hover:bg-secondary/40 transition">
                    <div className="flex items-start gap-3">
                      <span className="text-xs font-mono text-muted-foreground mt-0.5 w-28 shrink-0">{formatDateTime(e.date) || e.ts}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("chip text-[10px] uppercase", severityTone[e.severity])}>{e.severity}</span>
                          <p className="text-sm font-medium">{e.type}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{e.detail}</p>
                        {(() => {
                          // Mostrar IP y User-Agent como elementos separados (alternativa 2)
                          const showServerIcon = !displayUA && displayIP && displayIP.toString().toLowerCase().includes("serv") ;
                          return (
                            <div>
                              <div className="flex items-center gap-2 mt-1">
                                {showServerIcon ? <Server className="h-3 w-3 text-muted-foreground" /> : <Smartphone className="h-3 w-3 text-muted-foreground" />}
                                <span className="font-medium">{displayUser}</span>
                              </div>

                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-[11px] text-muted-foreground">IP:</span>
                                <span className="text-[11px] font-mono">{displayIP || "-"}</span>
                                <span className="text-[11px] text-muted-foreground">Navegador:</span>
                                <span className="text-[11px] break-all">{displayUA || "-"}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <ChevronRight className={cn("h-4 w-4 text-muted-foreground mt-0.5 transition-transform", isOpen && "rotate-90")} />
                    </div>
                    {isOpen && (
                      <div className="mt-3 ml-12 rounded-xl bg-secondary/60 p-3 space-y-1.5 text-xs">
                        <KV k="Timestamp" v={formatDateTime(e.date) || e.ts} />
                        <KV k="Usuario" v={displayUser} />
                        <KV k="IP" v={displayIP || "-"} />
                        <KV k="Navegador" v={displayUA || "-"} />
                        <KV k="Referencia" v={e.detail} />
                        {e.before && Object.keys(e.before || {}).length > 0 ? (
                          <div>
                            <p className="text-[11px] font-medium">Antes</p>
                            <pre className="text-xs bg-card p-2 rounded mt-1 overflow-auto">{JSON.stringify(e.before, null, 2)}</pre>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Antes: sin datos previos almacenados</p>
                        )}
                        {e.after && Object.keys(e.after || {}).length > 0 ? (
                          <div>
                            <p className="text-[11px] font-medium">Después</p>
                            <pre className="text-xs bg-card p-2 rounded mt-1 overflow-auto">{JSON.stringify(e.after, null, 2)}</pre>
                          </div>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Después: sin datos almacenados</p>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          )}
        </div>

        <Pager page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGo={setPage} />

        <p className="text-[11px] text-muted-foreground text-center">
          Mostrando {pageItems.length} de {list.length} eventos · página {page}/{totalPages}. Retención 12 meses · exportación solo Admin.
        </p>
      </div>
    </>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-muted-foreground w-24 shrink-0">{k}</span>
      <span className="font-medium break-all">{v}</span>
    </div>
  );
}
