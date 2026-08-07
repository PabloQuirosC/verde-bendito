import { useEffect } from "react";
import { Utensils, X, Printer } from "lucide-react";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { formatCRC, formatDateTime } from "@/lib/format";

interface Props {
  orderId: string;
  onClose: () => void;
}

const PAYMENT_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  sinpe: "SINPE Móvil",
  tarjeta: "Tarjeta",
};

export function Receipt({ orderId, onClose }: Props) {
  const order = useStore((s) => s.orders.find((o) => o.id === orderId));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-3 border-b print:hidden">
          <div className="text-sm font-medium">Vista previa de ticket</div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="print-area p-6 font-mono text-[13px] text-foreground bg-card">
          <div className="text-center mb-4">
            <div className="inline-flex h-12 w-12 rounded-full bg-primary text-primary-foreground items-center justify-center mb-2">
              <Utensils className="h-6 w-6" />
            </div>
            <div className="font-display text-2xl">Verde Bendito</div>
            <div className="text-xs text-muted-foreground">Restaurante & Bar</div>
            <div className="text-xs text-muted-foreground">Avenida Central, San José, CR</div>
            <div className="text-xs text-muted-foreground">Cédula Jurídica 3-101-000000</div>
          </div>

          <div className="border-t border-dashed border-current my-3" />

          <div className="grid grid-cols-2 gap-1 text-xs">
            <div>Ticket:</div><div className="text-right">{order.code}</div>
            <div>Mesa:</div><div className="text-right">{order.tableNumber}</div>
            <div>Mesero:</div><div className="text-right">{order.waiterName}</div>
            <div>Fecha:</div><div className="text-right">{formatDateTime(order.updatedAt)}</div>
          </div>

          <div className="border-t border-dashed border-current my-3" />

          <table className="w-full text-xs">
            <thead>
              <tr className="text-left">
                <th className="py-1">Cant</th>
                <th>Producto</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id}>
                  <td className="py-0.5">{it.qty}</td>
                  <td>{it.name}</td>
                  <td className="text-right">{formatCRC(it.price * it.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-current my-3" />

          <div className="space-y-0.5 text-xs">
            <Line label="Subtotal" value={formatCRC(order.subtotal)} />
            <Line label="IVA 13%" value={formatCRC(order.tax)} />
            <div className="border-t border-current my-1" />
            <Line label="TOTAL" value={formatCRC(order.total)} bold />
          </div>

          {order.payment && (
            <>
              <div className="border-t border-dashed border-current my-3" />
              <div className="space-y-0.5 text-xs">
                <Line label="Pago" value={PAYMENT_LABEL[order.payment.method] ?? order.payment.method} />
                {order.payment.received !== undefined && (
                  <Line label="Recibido" value={formatCRC(order.payment.received)} />
                )}
                {order.payment.change !== undefined && (
                  <Line label="Vuelto" value={formatCRC(order.payment.change)} />
                )}
                {order.payment.reference && (
                  <Line label="Ref" value={order.payment.reference} />
                )}
              </div>
            </>
          )}

          <div className="border-t border-dashed border-current my-3" />

          <div className="text-center text-xs text-muted-foreground space-y-1">
            <div>¡Gracias por su visita!</div>
            <div>www.mesaviva.cr</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={"flex justify-between " + (bold ? "font-bold text-base" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
