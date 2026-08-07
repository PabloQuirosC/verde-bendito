import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "inline-flex h-10 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors",
    isActive ? "bg-primary text-primary-foreground shadow-soft" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
  );

export function AdminProveedoresSubnav() {
  return (
    <div className="px-4 lg:px-6 pt-4 pb-1">
      <div className="inline-flex rounded-full bg-secondary/70 p-1 shadow-sm">
        <NavLink to="/admin/proveedores" end className={linkClass}>
          Proveedores
        </NavLink>
        <NavLink to="/admin/inventario" className={linkClass}>
          Inventario
        </NavLink>
      </div>
    </div>
  );
}