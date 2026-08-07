import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ChefHat,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Moon,
  Package,
  ScrollText,
  Sun,
  Table2,
  Users2,
  Volume2,
  VolumeX,
  Utensils,
  Bell,
} from "lucide-react";
import { useStore } from "@/store/useStore";
import { useLiveSimulator } from "@/hooks/useLiveSimulator";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import ForceChangePasswordModal from "@/components/ForceChangePasswordModal";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
}

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
  { to: "/mesas", label: "Mesas", icon: Table2, module: "mesas" },
  { to: "/comandas", label: "Comandas", icon: ScrollText, module: "mesas" },
  { to: "/cocina", label: "Cocina", icon: ChefHat, module: "cocina" },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell, module: "mesero" },
  { to: "/productos", label: "Productos", icon: Package, module: "inventario" },
  { to: "/clientes", label: "Clientes", icon: Users2, module: "usuarios" },
  { to: "/pagos", label: "Pagos", icon: CreditCard, module: "caja" },
  { to: "/caja", label: "Caja", icon: CreditCard, module: "caja" },
  { to: "/inventario", label: "Inventario", icon: Package, module: "inventario" },
  { to: "/usuarios", label: "Usuarios", icon: Users2, module: "usuarios" },
  { to: "/auditoria", label: "Auditoría", icon: ScrollText, module: "auditoria" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const soundEnabled = useStore((s) => s.soundEnabled);
  const toggleSound = useStore((s) => s.toggleSound);
  const authHydrated = useStore((s) => s.authHydrated);
  const currentUser = useStore((s) => s.currentUser());
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserName = useStore((s) => s.currentUserName);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const modulesFor = useStore((s) => s.modulesFor);
  const labelFor = useStore((s) => s.labelFor);
  const logout = useStore((s) => s.logout);
  const orders = useStore((s) => s.orders);
  const location = useLocation();
  const navigate = useNavigate();
  const { count: notificationCount, resetCount } = useNotificationCount();

  useLiveSimulator();
  
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const roleAliases: Record<string, string> = {
    administrador: "admin",
    admin: "admin",
    gerente: "admin",
    mesero: "mesero",
    waiter: "mesero",
    cocinero: "cocina",
    cocina: "cocina",
    chef: "cocina",
    cajero: "cajero",
    caja: "cajero",
    cajas: "cajero",
  };

  const normalizeRole = (value?: string | null) => {
    const normalized = String(value ?? "").trim().toLowerCase();
    return roleAliases[normalized] || String(value ?? "").trim() || "mesero";
  };

  const sessionRole = normalizeRole(currentUser?.role) || normalizeRole(currentUserRole) || "mesero";
  const sessionLabel = currentUser?.name ?? currentUserName ?? currentUserId ?? "Usuario";
  const sessionUsername = currentUser?.username ?? currentUserName ?? currentUserId ?? "Usuario";

  const allowed = authHydrated ? modulesFor(sessionRole) : [];
  const items = NAV.filter((n) => allowed.includes(n.module as never));

  // si la ruta actual no es permitida, redirige al primer módulo permitido
  useEffect(() => {
    if (!authHydrated) return;
    if (items.length === 0) return;
    const path = location.pathname.replace(/^\//, "").split("/")[0] || "dashboard";
    const moduleMatch = NAV.find((n) => n.to === `/${path}`)?.module;
    if (moduleMatch && !allowed.includes(moduleMatch as never)) {
      navigate({ to: items[0].to });
    }
    
    // Resetear contador de notificaciones cuando se accede a la página
    if (location.pathname === "/notificaciones") {
      resetCount();
    }
  }, [allowed, authHydrated, items, location.pathname, navigate, resetCount]);

  if (!authHydrated) return null;

  const pendingKitchen = orders.filter((o) => o.status === "pendiente" || o.status === "proceso").length;
  const readyToPay = orders.filter((o) => o.status === "listo").length;

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background grain">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-2 px-3 h-16 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground grid place-items-center">
            <Utensils className="h-4 w-4" />
          </div>
          <div className="leading-tight flex-1">
            <div className="font-display text-sm">Verde Bendito</div>
            <div className="text-[8px] uppercase tracking-widest text-muted-foreground">POS</div>
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            const badge =
              it.module === "cocina" && pendingKitchen > 0
                ? pendingKitchen
                : it.module === "caja" && readyToPay > 0
                  ? readyToPay
                  : it.module === "mesero" && notificationCount > 0
                    ? notificationCount
                    : null;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 min-w-0">{it.label}</span>
                {badge !== null && (
                  <span className="text-[8px] font-bold rounded-full bg-primary text-primary-foreground px-1 py-0.5 shrink-0">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-2 text-[8px] text-muted-foreground text-center">
          v1.0
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-14 sm:h-16 border-b bg-card/80 backdrop-blur flex items-center justify-between px-3 sm:px-4 md:px-6 gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="md:hidden h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary text-primary-foreground grid place-items-center shrink-0">
              <Utensils className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0 flex items-baseline gap-1.5 sm:gap-2">
              <span className="font-display text-xs sm:text-sm md:text-base lg:text-lg truncate">
                @{sessionUsername}
              </span>
              <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground truncate">
                · {labelFor(sessionRole)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 md:gap-2">
            <Link to="/notificaciones">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 relative" aria-label="Notificaciones" title="Notificaciones">
                <Bell className="h-4 w-4" />
                {notificationCount > 0 && (
                  <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={toggleSound} aria-label="Sonidos">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={toggleTheme} aria-label="Tema">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" onClick={handleLogout} aria-label="Cerrar sesion" title="Cerrar sesion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="md:hidden flex overflow-x-auto gap-0.5 border-b bg-card/60 px-2 py-1.5">
          {items.map((it) => {
            const active = location.pathname.startsWith(it.to);
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={cn(
                  "flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[10px] whitespace-nowrap",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <Toaster />
      <ForceChangePasswordModal />
    </div>
  );
}
