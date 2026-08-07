import { Link, useNavigate } from "react-router-dom";
import { ChefHat, Wallet, ClipboardList, ShieldCheck, Printer, Wifi, Settings, Lock } from "lucide-react";
import { useSession } from "@/context/session";
import type { Role } from "@/data/mock";
import { cn } from "@/lib/utils";

const roles: Array<{ id: Role; title: string; desc: string; icon: typeof ChefHat; to: string; tone: string }> = [
  { id: "mesero", title: "Mesero", desc: "Tomar comandas y enviar a cocina", icon: ClipboardList, to: "/mesero/mesas", tone: "from-primary to-primary-glow" },
  { id: "cocina", title: "Cocina", desc: "Tablero de pedidos y preparación", icon: ChefHat, to: "/cocina", tone: "from-warm to-accent" },
  { id: "cajero", title: "Cajero", desc: "Cobrar y dividir cuenta", icon: Wallet, to: "/cajero", tone: "from-accent to-warm" },
  { id: "admin", title: "Administrador", desc: "Reportes, inventario y usuarios", icon: ShieldCheck, to: "/admin", tone: "from-surface-deep to-primary" },
];

export default function RoleSelect() {
  const { setRole, user, availableRoles } = useSession();
  const nav = useNavigate();

  const pick = (r: Role, to: string, allowed: boolean) => {
    if (!allowed) return;
    setRole(r);
    nav(to);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-md px-5 pt-[max(env(safe-area-inset-top),2rem)] pb-12">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Hola, {user}</p>
            <h1 className="font-display text-2xl mt-1">Selecciona tu rol</h1>
            <p className="text-xs text-muted-foreground mt-1">El menú y permisos se ajustan según tu rol.</p>
          </div>
          <Link to="/admin/ajustes" className="grid h-10 w-10 place-items-center rounded-full bg-secondary hover:bg-secondary/80">
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 flex items-center gap-3 rounded-2xl bg-card p-3 shadow-soft border border-border/60">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-success/15">
            <Printer className="h-4 w-4 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Impresora conectada</p>
            <p className="text-xs text-muted-foreground">EPSON TM‑M30 · Salón principal</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-success font-medium">
            <Wifi className="h-3.5 w-3.5" /> En línea
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {roles.map((r) => {
            const Icon = r.icon;
            const allowed = availableRoles.includes(r.id);
            return (
              <button
                key={r.id}
                onClick={() => pick(r.id, r.to, allowed)}
                disabled={!allowed}
                className={cn(
                  "group relative text-left rounded-2xl bg-card p-5 shadow-card border border-border/60 transition-all",
                  allowed
                    ? "hover:border-primary/30 hover:shadow-float active:scale-[0.98] cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                {!allowed && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground bg-secondary rounded-full px-2 py-0.5">
                    <Lock className="h-2.5 w-2.5" /> Sin acceso
                  </span>
                )}
                <div className={cn("grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br", r.tone, "text-primary-foreground shadow-soft")}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="font-display text-lg mt-4">{r.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{r.desc}</p>
              </button>
            );
          })}
        </div>

        <Link to="/" className="block text-center text-sm text-muted-foreground mt-8 hover:text-foreground">
          Cerrar sesión
        </Link>
      </div>
    </main>
  );
}
