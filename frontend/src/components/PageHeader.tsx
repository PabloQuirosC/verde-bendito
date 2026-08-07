import { ReactNode } from "react";
import { ChevronLeft, Home } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/session";

const roleHome: Record<string, string> = {
  mesero: "/mesero/mesas",
  cocina: "/cocina",
  cajero: "/cajero",
  admin: "/admin",
};

interface Props {
  title: string;
  subtitle?: string;
  back?: string | true;
  /** Show a "back to role selector" button on the left (for top-level role screens). */
  home?: boolean;
  brand?: boolean;
  right?: ReactNode;
  className?: string;
  variant?: "default" | "deep";
}

export function PageHeader({ title, subtitle, back, home, brand = true, right, className, variant = "default" }: Props) {
  const navigate = useNavigate();
  const { role } = useSession();
  const isDeep = variant === "deep";
  const homeTo = role ? roleHome[role] ?? "/roles" : "/roles";
  return (
    <header
      className={cn(
        "sticky top-0 z-30 px-4 pt-[max(env(safe-area-inset-top),0.5rem)] pb-2.5",
        isDeep ? "bg-surface-deep text-surface-deep-foreground" : "bg-background/80 backdrop-blur-xl border-b border-border/50",
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        {back && (
          <button
            onClick={() => (typeof back === "string" ? navigate(back) : navigate(-1))}
            className={cn(
              "grid h-8.5 w-8.5 place-items-center rounded-full border transition-colors shrink-0",
              isDeep ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-border/60 bg-card hover:bg-secondary"
            )}
            aria-label="Atrás"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
        )}
        {home && !back && (
          <Link
            to={homeTo}
            className={cn(
              "grid h-8.5 w-8.5 place-items-center rounded-full border transition-colors shrink-0",
              isDeep ? "border-white/10 bg-white/10 hover:bg-white/15" : "border-border/60 bg-card hover:bg-secondary"
            )}
            aria-label="Cambiar de rol"
            title="Cambiar de rol"
          >
            <Home className="h-4 w-4" />
          </Link>
        )}
        <div className="flex-1 min-w-0">
          <h1 className={cn("font-display text-[1.2rem] sm:text-[1.35rem] leading-none truncate tracking-[-0.02em]", isDeep && "text-white")}>{title}</h1>
          {subtitle && (
            <p className={cn("mt-0.5 truncate text-[10px] sm:text-[11px] tracking-[0.14em]", isDeep ? "text-white/65" : "text-muted-foreground")}>
              {subtitle}
            </p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}
