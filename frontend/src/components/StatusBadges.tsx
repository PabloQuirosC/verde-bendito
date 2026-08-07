import { cn } from "@/lib/utils";
import type { OrderStatus, TableStatus } from "@/store/types";

const ORDER_LABEL: Record<OrderStatus, string> = {
  borrador: "Borrador",
  pendiente: "Pendiente",
  proceso: "En proceso",
  listo: "Listo",
  entregado: "Entregado",
  cobrado: "Cobrado",
  cancelado: "Cancelado",
};

const ORDER_CLASS: Record<OrderStatus, string> = {
  borrador: "bg-muted text-muted-foreground",
  pendiente: "bg-warning/20 text-warning-foreground border border-warning/30",
  proceso: "bg-info/20 text-info border border-info/30",
  listo: "bg-success/20 text-success border border-success/40",
  entregado: "bg-secondary text-secondary-foreground",
  cobrado: "bg-primary/15 text-primary border border-primary/30",
  cancelado: "bg-destructive/15 text-destructive border border-destructive/30",
};

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide",
        ORDER_CLASS[status],
        className,
      )}
    >
      {ORDER_LABEL[status]}
    </span>
  );
}

const TABLE_LABEL: Record<TableStatus, string> = {
  libre: "Libre",
  ocupada: "Ocupada",
  proceso: "En proceso",
  porCobrar: "Por cobrar",
};

const TABLE_CLASS: Record<TableStatus, string> = {
  libre: "bg-success/15 text-success border-success/40",
  ocupada: "bg-warning/20 text-warning-foreground border-warning/40",
  proceso: "bg-info/15 text-info border-info/40",
  porCobrar: "bg-primary/15 text-primary border-primary/40",
};

export function TableStatusBadge({ status }: { status: TableStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border",
        TABLE_CLASS[status],
      )}
    >
      {TABLE_LABEL[status]}
    </span>
  );
}
