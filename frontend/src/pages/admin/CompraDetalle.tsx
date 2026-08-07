import { useEffect, useMemo, useState } from "react";
import { CalendarDays, CircleDollarSign, ClipboardList, PackageSearch, ShoppingBag } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type DetalleCompra = {
  id: number;
  producto_id: number;
  producto_nombre?: string | null;
  producto_categoria?: string | null;
  producto_stock?: number | null;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number | null;
  lote?: string | null;
  fecha_expiracion?: string | null;
};

type CompraDetalle = {
  id: number;
  numero: string;
  fecha?: string | null;
  fecha_entrega_esperada?: string | null;
  fecha_entrega?: string | null;
  proveedor_id: number;
  proveedor_nombre?: string | null;
  usuario_id?: number | null;
  usuario_nombre?: string | null;
  subtotal?: number | null;
  impuesto?: number | null;
  total?: number | null;
  estado?: string | null;
  detalles?: DetalleCompra[];
};

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function formatDateOnly(value?: string | null) {
  if (!value) return "Sin fecha";
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map((part) => Number(part));
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium" }).format(new Date(year, month - 1, day));
}

function formatDateTimeLocal(value?: string | null) {
  if (!value) return "Sin fecha";
  const normalized = value.includes(" ") ? value.replace(" ", "T") : value;
  const compact = normalized.slice(0, 16);
  if (compact.length < 16) return value;
  const [datePart, timePart] = compact.split("T");
  if (!datePart || !timePart) return value;
  const [year, month, day] = datePart.split("-").map((part) => Number(part));
  const [hours, minutes] = timePart.split(":").map((part) => Number(part));
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const date = new Date(year, month - 1, day, hours, minutes);
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function AdminCompraDetalle() {
  const params = useParams();
  const compraId = Number(params.id);

  const compraQuery = useQuery({
    queryKey: ["admin-compra", compraId],
    queryFn: async () => {
      const response = await apiClient.obtenerCompra(compraId);
      return (response?.data ?? response) as CompraDetalle;
    },
    enabled: Number.isFinite(compraId),
  });

  const compra = compraQuery.data;
  const detalles = useMemo(() => compra?.detalles ?? [], [compra?.detalles]);
  const [quantityDrafts, setQuantityDrafts] = useState<Record<number, string>>({});
  const [savingDetalleId, setSavingDetalleId] = useState<number | null>(null);

  useEffect(() => {
    const nextDrafts: Record<number, string> = {};
    for (const detalle of detalles) {
      nextDrafts[detalle.id] = String(detalle.cantidad ?? 0);
    }
    setQuantityDrafts(nextDrafts);
  }, [detalles]);

  const handleSaveCantidad = async (detalleId: number) => {
    if (!compra?.id) return;
    const cantidad = Number(quantityDrafts[detalleId]);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      toast.error("La cantidad debe ser mayor o igual a 1");
      return;
    }

    setSavingDetalleId(detalleId);
    try {
      await apiClient.actualizarDetalleCompra(compra.id, detalleId, { cantidad });
      toast.success("Cantidad actualizada");
      await compraQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo actualizar la cantidad";
      toast.error(message);
    } finally {
      setSavingDetalleId(null);
    }
  };

  return (
    <>
      <PageHeader
        title={`Compra ${compra?.numero ?? "#"}`}
        subtitle={`${formatDateTimeLocal(compra?.fecha)} · Estado ${compra?.estado ?? "pendiente"}`}
        brand={false}
        back="/admin/compras"
      />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        <section className="grid gap-3 sm:grid-cols-4">
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Subtotal</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(compra?.subtotal)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Impuesto</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(compra?.impuesto)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(compra?.total)}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Detalles</p>
              <p className="mt-2 text-2xl font-semibold">{detalles.length}</p>
            </CardContent>
          </Card>
        </section>

        <Card className="shadow-soft border-border/60">
          <CardContent className="p-5 space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                <ShoppingBag className="h-3.5 w-3.5" />
                {compra?.proveedor_nombre ?? `Proveedor #${compra?.proveedor_id ?? "-"}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                <ClipboardList className="h-3.5 w-3.5" />
                {compra?.usuario_nombre ?? `Usuario #${compra?.usuario_id ?? "-"}`}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {formatDateTimeLocal(compra?.fecha)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                Fecha esperada: {formatDateOnly(compra?.fecha_entrega_esperada)}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1">
                Fecha entrega: {formatDateOnly(compra?.fecha_entrega)}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="grid grid-cols-12 gap-2 bg-secondary/60 px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <div className="col-span-4 sm:col-span-3">Producto</div>
                <div className="col-span-2">Cant.</div>
                <div className="col-span-2 sm:col-span-3">Precio</div>
                <div className="col-span-2">Subtotal</div>
                <div className="col-span-2 sm:col-span-2">Stock</div>
              </div>
              {detalles.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">Esta compra no tiene detalles visibles.</div>
              ) : (
                detalles.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 border-t border-border/60 px-4 py-3 text-sm items-center">
                    <div className="col-span-4 sm:col-span-3 space-y-1">
                      <p className="font-medium leading-tight">{item.producto_nombre ?? `#${item.producto_id}`}</p>
                      <p className="text-xs text-muted-foreground">{item.producto_categoria ?? "Sin categoría"}</p>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Input
                        type="number"
                        min="1"
                        value={quantityDrafts[item.id] ?? String(item.cantidad)}
                        onChange={(e) => setQuantityDrafts((current) => ({ ...current, [item.id]: e.target.value }))}
                        className="h-9 w-full"
                      />
                      <Button size="sm" variant="outline" onClick={() => handleSaveCantidad(item.id)} disabled={savingDetalleId === item.id} className="w-full">
                        {savingDetalleId === item.id ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                    <div className="col-span-2 sm:col-span-3">{formatCurrency(item.precio_unitario)}</div>
                    <div className="col-span-2">{formatCurrency(item.subtotal)}</div>
                    <div className="col-span-2 sm:col-span-2">{item.producto_stock ?? "-"}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
