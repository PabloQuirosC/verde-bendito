import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onGo?: (p: number) => void;
  className?: string;
}

export function Pager({ page, totalPages, onPrev, onNext, onGo, className }: Props) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visiblePages = totalPages <= 5
    ? pages
    : [
        1,
        ...(page > 3 ? ["ellipsis-left" as const] : []),
        ...pages.filter((p) => p > 1 && p < totalPages && Math.abs(p - page) <= 1),
        ...(page < totalPages - 2 ? ["ellipsis-right" as const] : []),
        totalPages,
      ].filter((value, index, array) => {
        if (typeof value === "number") return true;
        return array.indexOf(value) === index;
      });

  return (
    <div className={cn("flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-xs text-muted-foreground text-center sm:text-left">
        Página {page} de {Math.max(totalPages, 1)}
      </p>

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          onClick={() => onGo?.(1)}
          disabled={page === 1}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40 hover:bg-secondary/80"
          aria-label="Primera página"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button
          onClick={onPrev}
          disabled={page === 1}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40 hover:bg-secondary/80"
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {visiblePages.map((p) =>
          typeof p === "number" ? (
            <button
              key={p}
              onClick={() => onGo?.(p)}
              className={cn(
                "h-9 min-w-9 px-3 rounded-full text-xs font-medium transition-colors",
                p === page
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {p}
            </button>
          ) : (
            <span key={p} className="px-1 text-muted-foreground text-xs">
              …
            </span>
          )
        )}

        <button
          onClick={onNext}
          disabled={page === totalPages}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40 hover:bg-secondary/80"
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => onGo?.(totalPages)}
          disabled={page === totalPages}
          className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-secondary-foreground disabled:opacity-40 hover:bg-secondary/80"
          aria-label="Última página"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
