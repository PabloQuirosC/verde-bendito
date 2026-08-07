import { PageHeader } from "@/components/PageHeader";
import { CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HistorialItem {
  id: number;
  comanda_numero: string;
  mesa: string;
  producto_nombre: string;
  cantidad: number;
  fecha_creacion: string;
  tiempo_cocina: string;
}

export default function CocinaHistorial() {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistorial = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("auth_token");
      const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      const res = await fetch(`${base}/comandas/cocina/historial`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        toast.error("Error al cargar historial");
        return;
      }

      const data = await res.json();
      if (data.success && data.data) {
        setHistorial(data.data);
      }
    } catch (err) {
      console.error("Error loading historial:", err);
      toast.error("Error al cargar historial");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistorial();
  }, []);

  const formatTime = (isoString: string) => {
    if (!isoString) return "--:--";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "--:--";
    }
  };

  return (
    <>
      <PageHeader
        title="Historial de cocina"
        subtitle="Hoy"
        home
        right={
          <button
            onClick={loadHistorial}
            disabled={loading}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-50",
              "transition"
            )}
            title="Recargar historial"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        }
      />
      <div className="px-4 pb-6 space-y-2">
        {historial.length === 0 ? (
          <div className="rounded-xl bg-card p-3.5 border border-border/60 shadow-soft text-center text-muted-foreground text-sm">
            Sin órdenes completadas hoy
          </div>
        ) : (
          historial.map((p) => (
            <div key={p.id} className="rounded-xl bg-card p-3.5 border border-border/60 shadow-soft flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Pedido #{p.comanda_numero} · {p.mesa}
                  {p.cantidad > 1 && ` (${p.cantidad}x)`}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.producto_nombre}
                </p>
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3" /> Completado {formatTime(p.fecha_creacion)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
