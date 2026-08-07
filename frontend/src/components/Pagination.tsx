import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  total: number;
  onPage: (p: number) => void;
}

export function Pagination({ page, totalPages, rangeStart, rangeEnd, total, onPage }: Props) {
  if (total === 0) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 border-t bg-card/40">
      <div className="text-xs text-muted-foreground">
        {rangeStart}–{rangeEnd} de {total}
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPage(p)}
            className={cn(
              "h-7 min-w-[28px] px-2 rounded-md text-xs font-medium transition",
              p === page
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
          aria-label="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
