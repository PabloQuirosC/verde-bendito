import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Edit, PackageSearch, Plus, RefreshCw, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Pager } from "@/components/Pager";
import { usePagination } from "@/hooks/use-pagination";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSession } from "@/context/session";

type CompraItem = {
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
  detalles_count?: number;
};

type ProviderOption = { id: number; nombre: string };
type ProductOption = { id: number; nombre: string; precio?: number | null };
type PurchaseLine = {
  producto_id: string;
  cantidad: string;
  precio_unitario: string;
  lote: string;
  fecha_expiracion: string;
};

type EditPurchaseForm = {
  estado: string;
  fecha_entrega_esperada: string;
  fecha_entrega: string;
  descripcion: string;
};

type EditPurchaseDetail = {
  id: number;
  producto_id: number;
  producto_nombre?: string | null;
  cantidad: number;
  precio_unitario: number;
  subtotal?: number | null;
};

const newLine = (): PurchaseLine => ({ producto_id: "", cantidad: "1", precio_unitario: "", lote: "", fecha_expiracion: "" });
const emptyEditForm = (): EditPurchaseForm => ({ estado: "", fecha_entrega_esperada: "", fecha_entrega: "", descripcion: "" });
const emptyCreateForm = (): EditPurchaseForm => ({ estado: "pendiente", fecha_entrega_esperada: "", fecha_entrega: "", descripcion: "" });

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
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

function toDateTimePayloadValue(value?: string | null) {
  if (!value) return null;
  if (value.includes("T") || value.includes(" ")) return value;
  return `${value}T12:00:00`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    return message || fallback;
  }
  return fallback;
}

export default function AdminCompras() {
  const [q, setQ] = useState("");
  const { authUser } = useSession();
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [numero, setNumero] = useState("");
  const [proveedorId, setProveedorId] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [createForm, setCreateForm] = useState<EditPurchaseForm>(emptyCreateForm());
  const [lines, setLines] = useState<PurchaseLine[]>([newLine()]);
  const [selectedCompra, setSelectedCompra] = useState<CompraItem | null>(null);
  const [editForm, setEditForm] = useState<EditPurchaseForm>(emptyEditForm());
  const [editDetails, setEditDetails] = useState<EditPurchaseDetail[]>([]);
  const [savingDetailId, setSavingDetailId] = useState<number | null>(null);

  const proveedoresQuery = useQuery({
    queryKey: ["admin-compras-proveedores"],
    queryFn: async () => {
      const response = await apiClient.listarProveedores(0, 500);
      return Array.isArray(response) ? response : (response?.data ?? []);
    },
    staleTime: 60_000,
  });

  const productosQuery = useQuery({
    queryKey: ["admin-compras-productos"],
    queryFn: async () => {
      const response = await apiClient.listarProductos(0, 500);
      return Array.isArray(response) ? response : (response?.data ?? []);
    },
    staleTime: 60_000,
  });

  const comprasQuery = useQuery({
    queryKey: ["admin-compras"],
    queryFn: async () => {
      const response = await apiClient.listarCompras(0, 500);
      return Array.isArray(response) ? response : (response?.data ?? []);
    },
    staleTime: 20_000,
  });

  const compras = useMemo(() => comprasQuery.data ?? [], [comprasQuery.data]);
  const proveedores = useMemo(() => proveedoresQuery.data ?? [], [proveedoresQuery.data]) as ProviderOption[];
  const productos = useMemo(() => productosQuery.data ?? [], [productosQuery.data]) as ProductOption[];

  useEffect(() => {
    if (!createOpen) return;
    if (!numero) {
      const stamp = new Date();
      const defaultNumero = `COMP-${stamp.getFullYear()}${String(stamp.getMonth() + 1).padStart(2, "0")}${String(stamp.getDate()).padStart(2, "0")}-${String(stamp.getHours()).padStart(2, "0")}${String(stamp.getMinutes()).padStart(2, "0")}`;
      setNumero(defaultNumero);
    }
    if (!proveedorId && proveedores[0]) setProveedorId(String(proveedores[0].id));
  }, [createOpen, proveedores, numero, proveedorId]);

  useEffect(() => {
    if (!createOpen) return;
    setCreateForm((current) => ({
      ...current,
      estado: current.estado || "pendiente",
    }));
  }, [createOpen]);

  const updateLine = (index: number, key: keyof PurchaseLine, value: string) => {
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [key]: value } : line)));
  };

  const addLine = () => setLines((current) => [...current, newLine()]);
  const removeLine = (index: number) => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current);

  const calcLineSubtotal = (line: PurchaseLine) => {
    const qty = Number(line.cantidad || 0);
    const price = Number(line.precio_unitario || 0);
    return qty * price;
  };

  const subtotal = lines.reduce((acc, line) => acc + calcLineSubtotal(line), 0);
  const impuesto = subtotal * 0.13;
  const total = subtotal + impuesto;

  const resetCreateForm = () => {
    setNumero("");
    setProveedorId("");
    setDescripcion("");
    setCreateForm(emptyCreateForm());
    setLines([newLine()]);
  };

  const resetEditForm = () => {
    setSelectedCompra(null);
    setEditForm(emptyEditForm());
    setEditDetails([]);
  };

  const handleCreatePurchase = async () => {
    if (!numero.trim()) return toast.error("El número de compra es requerido");
    if (!proveedorId) return toast.error("Selecciona un proveedor");
    if (!authUser?.user_id) return toast.error("No se pudo determinar el usuario actual");

    const detalles = lines
      .filter((line) => line.producto_id && Number(line.cantidad) > 0 && Number(line.precio_unitario) > 0)
      .map((line) => ({
        producto_id: Number(line.producto_id),
        cantidad: Number(line.cantidad),
        precio_unitario: Number(line.precio_unitario),
        lote: line.lote.trim() || null,
        fecha_expiracion: line.fecha_expiracion || null,
      }));

    if (detalles.length === 0) return toast.error("Agrega al menos un detalle válido");

    setSaving(true);
    try {
      await apiClient.crearCompra({
        numero: numero.trim(),
        proveedor_id: Number(proveedorId),
        usuario_id: Number(authUser.user_id),
        subtotal,
        impuesto,
        total,
        estado: createForm.estado || null,
        fecha_entrega_esperada: createForm.fecha_entrega_esperada || null,
        fecha_entrega: toDateTimePayloadValue(createForm.fecha_entrega),
        descripcion: descripcion.trim() || null,
        detalles,
      });
      toast.success("Compra creada");
      setCreateOpen(false);
      resetCreateForm();
      await comprasQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo crear la compra"));
    } finally {
      setSaving(false);
    }
  };

  const openEditPurchase = async (compra: CompraItem) => {
    try {
      const response = await apiClient.obtenerCompra(compra.id);
      const data = (response?.data ?? response) as {
        id: number;
        numero: string;
        estado?: string | null;
        fecha_entrega_esperada?: string | null;
        fecha_entrega?: string | null;
        descripcion?: string | null;
        detalles?: EditPurchaseDetail[];
      };

      setSelectedCompra({ ...compra, numero: data.numero ?? compra.numero, estado: data.estado ?? compra.estado });
      setEditForm({
        estado: data.estado ?? compra.estado ?? "",
        fecha_entrega_esperada: toDateInputValue(data.fecha_entrega_esperada ?? compra.fecha_entrega_esperada),
        fecha_entrega: toDateInputValue(data.fecha_entrega ?? compra.fecha_entrega),
        descripcion: data.descripcion ?? "",
      });
      setEditDetails((data.detalles ?? []).map((detalle) => ({
        ...detalle,
        cantidad: Number(detalle.cantidad ?? 0),
        precio_unitario: Number(detalle.precio_unitario ?? 0),
        subtotal: detalle.subtotal != null ? Number(detalle.subtotal) : null,
      })));
      setEditOpen(true);
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo cargar la compra"));
    }
  };

  const handleUpdateDetailQuantity = async (detalleId: number, cantidad: number) => {
    if (!selectedCompra) return;
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      toast.error("La cantidad debe ser mayor o igual a 1");
      return;
    }

    setSavingDetailId(detalleId);
    try {
      await apiClient.actualizarDetalleCompra(selectedCompra.id, detalleId, { cantidad });
      toast.success("Cantidad actualizada");
      await comprasQuery.refetch();
      const response = await apiClient.obtenerCompra(selectedCompra.id);
      const refreshed = (response?.data ?? response) as { detalles?: EditPurchaseDetail[] };
      setEditDetails((refreshed.detalles ?? []).map((detalle) => ({
        ...detalle,
        cantidad: Number(detalle.cantidad ?? 0),
        precio_unitario: Number(detalle.precio_unitario ?? 0),
        subtotal: detalle.subtotal != null ? Number(detalle.subtotal) : null,
      })));
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar la cantidad"));
    } finally {
      setSavingDetailId(null);
    }
  };

  const handleUpdatePurchase = async () => {
    if (!selectedCompra) return;
    setSavingEdit(true);
    try {
      await apiClient.actualizarCompra(selectedCompra.id, {
        estado: editForm.estado || null,
        fecha_entrega_esperada: editForm.fecha_entrega_esperada || null,
        fecha_entrega: toDateTimePayloadValue(editForm.fecha_entrega),
        descripcion: editForm.descripcion.trim() || null,
      });
      toast.success("Compra actualizada");
      setEditOpen(false);
      resetEditForm();
      await comprasQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo actualizar la compra"));
    } finally {
      setSavingEdit(false);
    }
  };

  const openDeletePurchase = (compra: CompraItem) => {
    setSelectedCompra(compra);
    setDeleteOpen(true);
  };

  const handleDeletePurchase = async () => {
    if (!selectedCompra) return;
    setSavingEdit(true);
    try {
      await apiClient.eliminarCompra(selectedCompra.id);
      toast.success("Compra eliminada");
      setDeleteOpen(false);
      resetEditForm();
      await comprasQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudo eliminar la compra"));
    } finally {
      setSavingEdit(false);
    }
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return compras as CompraItem[];
    return (compras as CompraItem[]).filter((compra) => {
      const haystack = [
        compra.numero,
        compra.estado,
        String(compra.proveedor_id),
        String(compra.usuario_id),
        formatDateTimeLocal(compra.fecha),
        formatDateOnly(compra.fecha_entrega_esperada),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [compras, q]);

  const { page, setPage, totalPages, pageItems, next, prev } = usePagination(filtered, 8);
  const items = pageItems as CompraItem[];

  const totalCompras = compras.length;
  const totalMonto = compras.reduce((acc, item) => acc + Number(item.total ?? 0), 0);
  const pendientes = compras.filter((item) => String(item.estado ?? "").toLowerCase() === "pendiente").length;
  const confirmadas = compras.filter((item) => String(item.estado ?? "").toLowerCase() === "confirmada").length;

  const reload = async () => {
    try {
      await comprasQuery.refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "No se pudieron recargar las compras"));
    }
  };

  return (
    <>
      <PageHeader
        title="Compras"
        subtitle={`${totalCompras} compras · ${formatCurrency(totalMonto)}`}
        brand={false}
        right={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button onClick={() => setCreateOpen(true)} className="w-full rounded-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Nueva compra
            </Button>
          </div>
        }
      />

      <div className="px-4 lg:px-6 pt-4 pb-8 space-y-4">
        <section className="grid gap-3 sm:grid-cols-4">
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{totalCompras}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Pendientes</p>
              <p className="mt-2 text-2xl font-semibold">{pendientes}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Confirmadas</p>
              <p className="mt-2 text-2xl font-semibold">{confirmadas}</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft border-border/60">
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Monto</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalMonto)}</p>
            </CardContent>
          </Card>
        </section>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar por número, estado, proveedor o fecha..."
            className="w-full h-11 rounded-xl bg-secondary border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {comprasQuery.isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card shadow-soft p-12">
            <LoadingSpinner size="md" variant="spin" text="Cargando compras..." />
          </div>
        ) : (
        <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 border-b border-border/60">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Compra</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha esperada</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-sm text-muted-foreground">
                      <ShoppingBag className="mx-auto h-8 w-8 mb-2 text-muted-foreground" />
                      <p className="font-medium">No hay compras para mostrar</p>
                      <p className="mt-1 text-sm text-muted-foreground">Cuando se creen compras desde el backend, aparecerán aquí.</p>
                    </td>
                  </tr>
                ) : (
                  items.map((compra) => (
                    <tr key={compra.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm font-medium">
                            <PackageSearch className="h-4 w-4 text-muted-foreground" />
                            <span>#{compra.numero}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {compra.usuario_nombre ? `Registrada por ${compra.usuario_nombre}` : `Usuario #${compra.usuario_id ?? "-"}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{compra.proveedor_nombre ?? `Proveedor #${compra.proveedor_id}`}</p>
                        <p className="text-xs text-muted-foreground">{compra.detalles_count ?? 0} detalle(s)</p>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDateOnly(compra.fecha_entrega_esperada)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium capitalize">
                          {compra.estado ?? "pendiente"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <p className="text-sm font-semibold">{formatCurrency(compra.total)}</p>
                        <p className="text-xs text-muted-foreground">Sub {formatCurrency(compra.subtotal)} · Imp {formatCurrency(compra.impuesto)}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button asChild variant="outline" size="icon" className="h-8 w-8 rounded-lg">
                            <Link to={`/admin/compras/${compra.id}`} aria-label="Ver detalle">
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openEditPurchase(compra)} aria-label="Editar compra">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="destructive" size="icon" className="h-8 w-8 rounded-lg" onClick={() => openDeletePurchase(compra)} aria-label="Eliminar compra">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        <Pager page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGo={setPage} />
      </div>

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-5xl max-h-[92vh] overflow-y-auto overflow-x-hidden sm:w-auto">
          <DialogHeader>
            <DialogTitle>Nueva compra</DialogTitle>
            <DialogDescription>Registra una compra con uno o más detalles.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" value={numero} onChange={(e) => setNumero(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label>Proveedor</Label>
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {proveedores.map((prov) => (
                      <SelectItem key={prov.id} value={String(prov.id)}>{prov.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea id="descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Observaciones de la compra" />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label>Estado</Label>
                <Select value={createForm.estado} onValueChange={(value) => setCreateForm((current) => ({ ...current, estado: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="entregada">Entregada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create_fecha_entrega_esperada">Fecha esperada</Label>
                <Input
                  id="create_fecha_entrega_esperada"
                  type="date"
                  value={createForm.fecha_entrega_esperada}
                  onChange={(e) => setCreateForm((current) => ({ ...current, fecha_entrega_esperada: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create_fecha_entrega">Fecha entrega</Label>
                <Input
                  id="create_fecha_entrega"
                  type="date"
                  value={createForm.fecha_entrega}
                  onChange={(e) => setCreateForm((current) => ({ ...current, fecha_entrega: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Detalles</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLine}>Agregar línea</Button>
              </div>

              <div className="grid gap-3">
                {lines.map((line, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-border/60 p-3 sm:grid-cols-2 xl:grid-cols-12 xl:items-end">
                    <div className="grid gap-2 sm:col-span-2 xl:col-span-4">
                      <Label>Producto</Label>
                      <Select value={line.producto_id} onValueChange={(value) => {
                        const producto = productos.find((p) => String(p.id) === value);
                        updateLine(index, "producto_id", value);
                        if (producto?.precio != null && !line.precio_unitario) updateLine(index, "precio_unitario", String(producto.precio));
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {productos.map((producto) => (
                            <SelectItem key={producto.id} value={String(producto.id)}>
                              {producto.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2 sm:col-span-1 xl:col-span-2">
                      <Label>Cantidad</Label>
                      <Input type="number" min="1" value={line.cantidad} onChange={(e) => updateLine(index, "cantidad", e.target.value)} />
                    </div>
                    <div className="grid gap-2 sm:col-span-1 xl:col-span-2">
                      <Label>Precio</Label>
                      <Input type="number" min="0" step="0.01" value={line.precio_unitario} onChange={(e) => updateLine(index, "precio_unitario", e.target.value)} />
                    </div>
                    <div className="grid gap-2 sm:col-span-1 xl:col-span-2">
                      <Label>Lote</Label>
                      <Input value={line.lote} onChange={(e) => updateLine(index, "lote", e.target.value)} />
                    </div>
                    <div className="grid gap-2 sm:col-span-1 xl:col-span-2">
                      <Label>Vence</Label>
                      <Input type="date" value={line.fecha_expiracion} onChange={(e) => updateLine(index, "fecha_expiracion", e.target.value)} />
                    </div>
                    <div className="flex justify-start sm:col-span-2 xl:col-span-12 xl:justify-end">
                      <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => removeLine(index)} disabled={lines.length === 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="shadow-none border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Subtotal</p><p className="text-lg font-semibold">{formatCurrency(subtotal)}</p></CardContent></Card>
              <Card className="shadow-none border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Impuesto</p><p className="text-lg font-semibold">{formatCurrency(impuesto)}</p></CardContent></Card>
              <Card className="shadow-none border-border/60"><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-lg font-semibold">{formatCurrency(total)}</p></CardContent></Card>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePurchase} disabled={saving}>{saving ? "Guardando..." : "Crear compra"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) resetEditForm(); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden sm:w-auto">
          <DialogHeader>
            <DialogTitle>Editar compra</DialogTitle>
            <DialogDescription>Actualiza el estado y las notas de la compra.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Número</Label>
              <Input value={selectedCompra?.numero ?? ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={editForm.estado} onValueChange={(value) => setEditForm((current) => ({ ...current, estado: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="confirmada">Confirmada</SelectItem>
                  <SelectItem value="entregada">Entregada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha_entrega_esperada">Fecha esperada</Label>
              <Input id="fecha_entrega_esperada" type="date" value={editForm.fecha_entrega_esperada} onChange={(e) => setEditForm((current) => ({ ...current, fecha_entrega_esperada: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fecha_entrega">Fecha entrega</Label>
              <Input id="fecha_entrega" type="date" value={editForm.fecha_entrega} onChange={(e) => setEditForm((current) => ({ ...current, fecha_entrega: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit_descripcion">Descripción</Label>
              <Textarea id="edit_descripcion" value={editForm.descripcion} onChange={(e) => setEditForm((current) => ({ ...current, descripcion: e.target.value }))} />
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Detalles</Label>
                <span className="text-xs text-muted-foreground">Puedes ajustar la cantidad aquí</span>
              </div>
              <div className="grid gap-3">
                {editDetails.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    Esta compra no tiene detalles visibles.
                  </div>
                ) : (
                  editDetails.map((detalle) => (
                    <div key={detalle.id} className="grid gap-3 rounded-2xl border border-border/60 p-3 md:grid-cols-12 md:items-end">
                      <div className="md:col-span-6">
                        <p className="text-sm font-medium">{detalle.producto_nombre ?? `Producto #${detalle.producto_id}`}</p>
                        <p className="text-xs text-muted-foreground">Precio {formatCurrency(detalle.precio_unitario)}</p>
                      </div>
                      <div className="grid gap-2 md:col-span-3">
                        <Label className="text-xs">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={detalle.cantidad}
                          onChange={(e) => {
                            const value = e.target.value;
                            setEditDetails((current) => current.map((item) => (item.id === detalle.id ? { ...item, cantidad: Number(value || 0) } : item)));
                          }}
                        />
                      </div>
                      <div className="flex justify-start md:col-span-3 md:justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full md:w-auto"
                          onClick={() => handleUpdateDetailQuantity(detalle.id, detalle.cantidad)}
                          disabled={savingDetailId === detalle.id}
                        >
                          {savingDetailId === detalle.id ? "Guardando..." : "Guardar cantidad"}
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdatePurchase} disabled={savingEdit}>{savingEdit ? "Guardando..." : "Guardar cambios"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) resetEditForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar compra</DialogTitle>
            <DialogDescription>
              Esta acción eliminará la compra {selectedCompra ? `#${selectedCompra.numero}` : "seleccionada"}.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-muted-foreground">
            Se eliminarán también los detalles asociados.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDeletePurchase} disabled={savingEdit}>{savingEdit ? "Eliminando..." : "Eliminar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
