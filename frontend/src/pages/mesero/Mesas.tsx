import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Users, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStore } from "@/store/useStore";
import { useSession } from "@/context/session";

const statusStyles: Record<string, { label: string; tone: string }> = {
  libre: { label: "Libre", tone: "bg-success/15 text-success" },
  ocupada: { label: "Ocupada", tone: "bg-primary/15 text-primary" },
  proceso: { label: "En proceso", tone: "bg-warning/15 text-warning-foreground" },
  porCobrar: { label: "Por cobrar", tone: "bg-muted text-muted-foreground" },
};

const isOpenStatus = (status: string) => status === "libre";

const normalizeRoleLike = (value: unknown): string => {
  if (typeof value === "string") return value.trim().toLowerCase();
  if (value && typeof value === "object") {
    const roleObj = value as Record<string, unknown>;
    const roleValue = roleObj.nombre ?? roleObj.nombre_rol ?? roleObj.role ?? roleObj.name;
    return typeof roleValue === "string" ? roleValue.trim().toLowerCase() : "";
  }
  return "";
};

export default function MeseroMesas() {
  const navigate = useNavigate();
  const { role: sessionRole, authUser } = useSession();
  const { tables, loadTables, apiLoadOrdersOpen } = useStore();
  const [loading, setLoading] = useState(true);

  const canCreateMesas = () => {
    const normalizedRole = String(sessionRole ?? "").trim().toLowerCase();
    const userRoles = authUser?.roles?.map((r) => normalizeRoleLike(r)).filter(Boolean) ?? [];
    return (
      normalizedRole === "mesero" ||
      normalizedRole === "admin" ||
      normalizedRole === "administrador" ||
      normalizedRole === "gerente" ||
      userRoles.includes("mesero") ||
      userRoles.includes("admin") ||
      userRoles.includes("administrador") ||
      userRoles.includes("gerente")
    );
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadTables(), apiLoadOrdersOpen()]);
      setLoading(false);
    };
    void loadData();
  }, [loadTables, apiLoadOrdersOpen]);

  const counts = useMemo(() => ({
    libres: tables.filter((t) => t.status === "libre").length,
    ocupadas: tables.filter((t) => t.status === "ocupada").length,
    proceso: tables.filter((t) => t.status === "proceso").length,
  }), [tables]);

  const startOrder = async (tableId: string, number: number) => {
    const table = tables.find((t) => t.id === tableId);
    if (!table) {
      toast.error("No se encontró la mesa");
      return;
    }

    if (table.currentOrderId) {
      navigate(`/mesero/comanda/${tableId}`);
      return;
    }

    toast.success(`Mesa ${number} lista para tomar comanda`);
    navigate(`/mesero/comanda/${tableId}`);
  };

  return (
    <>
      <PageHeader
        title="Selecciona una mesa"
        subtitle="Elige una mesa para abrir o continuar la comanda"
        home
        brand={false}
        right={
          canCreateMesas() && (
            <Button
              onClick={() => navigate("/mesas/gestionar")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva mesa
            </Button>
          )
        }
      />

      <section className="px-4 mt-2 grid grid-cols-3 gap-2">
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-success">{counts.libres}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Libres</p>
        </div>
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-primary">{counts.ocupadas}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Ocupadas</p>
        </div>
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-warning">{counts.proceso}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">En proceso</p>
        </div>
      </section>

      <div className="px-4 mt-4 pb-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {loading ? (
          <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-border/60 bg-card p-12">
            <LoadingSpinner size="md" variant="spin" text="Cargando mesas..." />
          </div>
        ) : tables.map((table) => {
          const status = table.status === "libre" ? "libre" : table.status === "ocupada" ? "ocupada" : table.status;
          const style = statusStyles[status] ?? statusStyles.libre;
          const canOpen = isOpenStatus(status) || !!table.currentOrderId;

          return (
            <div
              key={table.id}
              className={cn(
                "rounded-2xl border p-3 shadow-soft flex flex-col justify-between",
                status === "ocupada" ? "border-primary/20 bg-primary/5" : "border-border/60 bg-card"
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("chip text-[10px] uppercase tracking-wider", style.tone)}>{style.label}</span>
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <Users className="h-3 w-3" /> {table.capacity || "?"}
                </span>
              </div>

              <p className="font-display text-3xl mt-3">{table.number.toString().padStart(2, "0")}</p>

              <p className="mt-1 text-xs text-muted-foreground inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {table.zone || "Salón"}
              </p>

              <Button
                className="mt-3 w-full"
                variant={canOpen ? "default" : "secondary"}
                onClick={() => void startOrder(table.id, table.number)}
              >
                {table.currentOrderId ? "Continuar comanda" : "Tomar comanda"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
    </>
  );
}