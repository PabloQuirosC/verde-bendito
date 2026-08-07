import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, ListOrdered, Settings, ChefHat, Wallet, LayoutDashboard, Boxes, Truck, Users, ScrollText, User, Menu, X, ChevronLeft, ChevronRight, LogOut, Table2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/session";
import type { Role } from "@/data/mock";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  highlight?: boolean;
}

const navByRole: Record<Role, NavItem[]> = {
  mesero: [
    { to: "/mesero/mesas", label: "Mesas", icon: Home },
    { to: "/mesero/ordenes", label: "Órdenes", icon: ListOrdered },
    { to: "/notificaciones", label: "Avisos", icon: Bell },
    { to: "/perfil", label: "Perfil", icon: User },
  ],
  cocina: [
    { to: "/cocina", label: "Tablero", icon: ChefHat },
    { to: "/cocina/historial", label: "Historial", icon: ScrollText },
    { to: "/notificaciones", label: "Avisos", icon: Bell },
    { to: "/perfil", label: "Perfil", icon: User },
  ],
  cajero: [
    { to: "/cajero", label: "Órdenes", icon: ListOrdered },
    { to: "/notificaciones", label: "Avisos", icon: Bell },
    { to: "/perfil", label: "Perfil", icon: User },
  ],
  admin: [
    { to: "/admin", label: "Panel", icon: LayoutDashboard },
    { to: "/mesas", label: "Mesas", icon: Table2 },
    { to: "/cocina", label: "Tablero", icon: ChefHat },
    { to: "/admin/compras", label: "Compras", icon: Wallet },
    { to: "/admin/inventario", label: "Stock", icon: Boxes },
    { to: "/admin/proveedores", label: "Proveedores", icon: Truck },
    { to: "/admin/usuarios", label: "Usuarios", icon: Users },
    { to: "/admin/bitacora", label: "Bitácora", icon: ScrollText },
  ],
};

export function AppShell({ children }: { children: ReactNode }) {
  const { role, logout, hasRole } = useSession();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = role === "admin" || hasRole("admin") || hasRole("administrador");
  const items = role ? navByRole[role] : isAdmin ? navByRole.admin : [];
  const showSidebar = isAdmin;

  useEffect(() => {
    const roleLabel: Record<Role, string> = {
      mesero: "Mesero",
      cocina: "Cocina",
      cajero: "Caja",
      admin: "Administrador",
    };

    const sectionTitle = (() => {
      if (location.pathname === "/") return "Inicio de sesión";
      if (location.pathname === "/roles") return "Selección de rol";
      if (location.pathname.startsWith("/admin")) return "Panel administrador";
      if (location.pathname.startsWith("/cocina")) return "Cocina";
      if (location.pathname.startsWith("/cajero")) return "Caja";
      if (location.pathname.startsWith("/mesero")) return "Mesero";
      if (location.pathname === "/perfil") return "Mi perfil";
      if (location.pathname === "/notificaciones") return "Notificaciones";
      return role ? roleLabel[role] : "Aplicación";
    })();

    document.title = `Verde Bendito · ${sectionTitle}`;
  }, [location.pathname, role]);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("vb.sidebarCollapsed") === "1"; } catch { return false; }
  });
  const [mobileSidebar, setMobileSidebar] = useState(false);

  useEffect(() => { try { localStorage.setItem("vb.sidebarCollapsed", collapsed ? "1" : "0"); } catch {} }, [collapsed]);
  useEffect(() => { setMobileSidebar(false); }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex w-full">
        {showSidebar && (
          <AdminSidebar
            pathname={location.pathname}
            collapsed={collapsed}
            mobileOpen={mobileSidebar}
            onMobileClose={() => setMobileSidebar(false)}
            onLogout={() => {
              logout();
              navigate("/");
            }}
          />
        )}
        <main className={cn("relative flex-1 min-w-0 min-h-screen pb-24 lg:pb-8", showSidebar && "lg:pb-8")}>
          {showSidebar && (
            <button
              onClick={() => setCollapsed((v) => !v)}
              className={cn(
                "hidden lg:grid absolute left-3 top-6 z-[60] h-10 w-10 place-items-center rounded-full border border-border/60 bg-card text-muted-foreground shadow-soft transition-colors hover:bg-accent hover:text-foreground",
                collapsed && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              )}
              aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
              title={collapsed ? "Expandir menú" : "Contraer menú"}
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          )}

          {showSidebar && (
            <button
              onClick={() => setMobileSidebar(true)}
              className="lg:hidden absolute top-4 left-4 z-40 grid h-10 w-10 place-items-center rounded-full bg-card border border-border shadow-soft"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          
          {/* Header con logo para usuarios no-admin */}
          {!showSidebar && (
            <header className="sticky top-0 z-20 bg-card/90 backdrop-blur-md border-b border-border/60 px-4 py-3">
              <div className="mx-auto flex max-w-[480px] lg:max-w-3xl items-center justify-between">
                <Link to={role ? { mesero: "/mesero/mesas", cocina: "/cocina", cajero: "/cajero" }[role] : "/"} className="flex items-center gap-2">
                  <img 
                    src="/logo.png" 
                    alt="Verde Bendito" 
                    className="h-10 w-10 object-contain"
                  />
                  <div>
                    <p className="font-display text-sm font-semibold text-foreground">Verde Bendito</p>
                    <p className="text-[11px] text-muted-foreground">Pos & Comandas</p>
                  </div>
                </Link>
              </div>
            </header>
          )}
          
          <div className={cn(
            "mx-auto w-full",
            showSidebar ? "max-w-6xl px-0 pl-12" : "max-w-[480px] lg:max-w-3xl"
          )}>
            {children}
          </div>
        </main>
      </div>

      {role && !showSidebar && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md">
          <ul className="mx-auto flex max-w-[520px] items-end justify-between px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
            {items.map((it) => {
              const Icon = it.icon;
              const active = location.pathname === it.to || (it.to !== "/" && location.pathname.startsWith(it.to.split("/").slice(0, 3).join("/")));
              if (it.highlight) {
                return (
                  <li key={`${it.to}-${it.label}`} className="-mt-6">
                    <Link
                      to={it.to}
                      className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95"
                      aria-label={it.label}
                    >
                      <Icon className="h-6 w-6" />
                    </Link>
                  </li>
                );
              }
              return (
                <li key={`${it.to}-${it.label}`} className="flex-1">
                  <Link
                    to={it.to}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} />
                    {it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

function AdminSidebar({
  pathname,
  collapsed,
  mobileOpen,
  onMobileClose,
  onLogout,
}: {
  pathname: string;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
}) {
  const items = [
    { to: "/admin", label: "Resumen", icon: LayoutDashboard },
    { to: "/mesas", label: "Mesas", icon: Table2 },
    { to: "/cocina", label: "Cocina", icon: ChefHat },
    { to: "/caja", label: "Cobros", icon: CreditCard },
    { to: "/admin/compras", label: "Compras", icon: Wallet },
    { to: "/admin/inventario", label: "Inventario", icon: Boxes },
    { to: "/admin/proveedores", label: "Proveedores", icon: Truck },
    { to: "/admin/usuarios", label: "Usuarios", icon: Users },
    { to: "/admin/bitacora", label: "Bitácora", icon: ScrollText },
    { to: "/admin/ajustes", label: "Ajustes", icon: Settings },
  ];

  const desktopWidth = collapsed ? "lg:w-16" : "lg:w-64";

  return (
    <>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" onClick={onMobileClose} />
      )}
      <aside
        className={cn(
          "z-50 flex flex-col overflow-hidden bg-card/95 text-sidebar-foreground border-r border-border/60 shadow-[18px_0_50px_-34px_rgba(0,0,0,0.30)] backdrop-blur-xl transition-[width] duration-200 ease-out",
          "fixed inset-y-0 left-0 w-[84vw] max-w-72 -translate-x-full lg:w-64 lg:max-w-none lg:translate-x-0",
          mobileOpen && "translate-x-0",
          "lg:sticky lg:top-0 lg:h-screen lg:flex",
          desktopWidth
        )}
      >
        <div className={cn(
          "relative border-b border-border/60 bg-gradient-to-b from-primary/5 to-transparent pt-5 pb-4",
          collapsed ? "px-2" : "px-3 lg:px-4"
        )}>
          <div className="flex items-center gap-2">
          <Link to="/admin" className={cn("flex items-center gap-2 min-w-0", collapsed ? "lg:mx-auto lg:flex-none" : "flex-1 lg:pr-12") }>
            <div className={cn(
              "grid shrink-0 place-items-center rounded-2xl bg-primary text-sm font-semibold text-primary-foreground shadow-sm transition-all",
              collapsed ? "h-10 w-10" : "h-11 w-11"
            )}>
              <img
                src="/logo.png"
                alt="Verde Bendito"
                className={cn("object-contain transition-all", collapsed ? "h-6 w-6" : "h-7 w-7")}
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="font-display text-base leading-none truncate text-foreground">Verde Bendito</p>
                <p className="text-[11px] text-muted-foreground mt-1 truncate">Panel de administración</p>
              </div>
            )}
          </Link>
          <button
            onClick={onMobileClose}
            className="lg:hidden grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border/60 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
          </div>
        </div>

        <nav className={cn("flex-1 overflow-y-auto py-3", collapsed ? "px-1" : "px-2")}>
          <ul className={cn("space-y-2", collapsed && "lg:space-y-1.5")}>
            {items.map((it) => {
              const Icon = it.icon;
              const active = pathname === it.to;
              return (
                <li key={it.to}>
                  <Link
                    to={it.to}
                    title={it.label}
                    className={cn(
                      "group relative flex items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-sm transition-all",
                      collapsed && "lg:justify-center lg:px-0 lg:py-2.5",
                      active
                        ? "bg-primary/10 text-foreground font-medium ring-1 ring-primary/15 shadow-sm"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                  >
                    <span className={cn(
                      "absolute left-0 top-2 bottom-2 w-1 rounded-r-full transition-colors",
                      active ? "bg-primary" : "bg-transparent group-hover:bg-primary/25"
                    )} />
                    <span className={cn(
                      "grid h-8 w-8 shrink-0 place-items-center rounded-xl transition-colors",
                      active ? "bg-primary text-primary-foreground" : "bg-muted/70 text-muted-foreground group-hover:bg-accent group-hover:text-foreground"
                    )}>
                      <Icon className="h-4 w-4" />
                    </span>
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border/60 bg-background/80 p-3">
          <button
            onClick={onLogout}
            className={cn(
              "w-full inline-flex items-center gap-3 rounded-2xl border border-border/60 bg-background px-3 py-3 text-sm text-muted-foreground transition-all hover:border-border hover:bg-accent/40 hover:text-foreground",
              collapsed && "lg:justify-center lg:px-2"
            )}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-muted/80 text-muted-foreground">
              <LogOut className="h-4 w-4" />
            </span>
            {!collapsed && (
              <span className="flex min-w-0 flex-col items-start text-left">
                <span className="truncate font-medium">Cerrar sesión</span>
                <span className="truncate text-[11px] text-muted-foreground">Salir del panel</span>
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
