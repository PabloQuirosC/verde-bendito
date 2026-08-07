import { useEffect, useMemo, useState } from "react";
import { Circle, Edit, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Pager } from "@/components/Pager";
import { usePagination } from "@/hooks/use-pagination";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type BackendProvider = {
  id: number;
  nombre: string;
  contacto_nombre?: string | null;
  contacto_telefono?: string | null;
  contacto_email?: string | null;
  direccion?: string | null;
  condicion_pago?: string | null;
  dias_credito?: number | null;
  activo: number;
  fecha_creacion?: string;
};

type ProviderStateFilter = {
  codigo: string;
  etiqueta: string;
  activo: number | null;
  cantidad: number;
};

type ProviderForm = {
  nombre: string;
  contacto_nombre: string;
  contacto_telefono: string;
  contacto_email: string;
  direccion: string;
  condicion_pago: string;
  dias_credito: string;
  activo: boolean;
};

function emptyForm(provider?: BackendProvider | null): ProviderForm {
  return {
    nombre: provider?.nombre ?? "",
    contacto_nombre: provider?.contacto_nombre ?? "",
    contacto_telefono: provider?.contacto_telefono ?? "",
    contacto_email: provider?.contacto_email ?? "",
    direccion: provider?.direccion ?? "",
    condicion_pago: provider?.condicion_pago ?? "",
    dias_credito: provider?.dias_credito?.toString() ?? "",
    activo: Number(provider?.activo ?? 1) === 1,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    return message || fallback;
  }
  return fallback;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

export default function AdminProveedores() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("todos");
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<number | null>(null);
  const [form, setForm] = useState<ProviderForm>(emptyForm());
  const [savingProvider, setSavingProvider] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [providerToDelete, setProviderToDelete] = useState<number | null>(null);

  const providersQuery = useQuery({
    queryKey: ["admin-proveedores"],
    queryFn: async () => apiClient.listarProveedores(0, 500) as Promise<BackendProvider[]>,
    staleTime: 30_000,
  });

  const providerStatesQuery = useQuery({
    queryKey: ["admin-proveedores-estados"],
    queryFn: async () => apiClient.listarEstadosProveedor() as Promise<ProviderStateFilter[]>,
    staleTime: 60_000,
  });

  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data]);
  const providerStates = useMemo(() => providerStatesQuery.data ?? [], [providerStatesQuery.data]);

  const filteredProviders = useMemo(
    () =>
      providers.filter((provider) => {
        if (filter === "activos" && Number(provider.activo) !== 1) return false;
        if (filter === "inactivos" && Number(provider.activo) !== 0) return false;
        if (q) {
          const query = q.toLowerCase();
          const haystack = [
            provider.nombre,
            provider.contacto_nombre,
            provider.contacto_telefono,
            provider.contacto_email,
            provider.condicion_pago,
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      }),
    [filter, providers, q]
  );

  const { page, setPage, totalPages, pageItems, next, prev } = usePagination(filteredProviders, 6);

  useEffect(() => {
    if (!providerDialogOpen) return;
    const provider = editingProviderId !== null ? providers.find((item) => item.id === editingProviderId) ?? null : null;
    setForm(emptyForm(provider));
  }, [editingProviderId, providerDialogOpen, providers]);

  const openCreateProvider = () => {
    setEditingProviderId(null);
    setForm(emptyForm());
    setProviderDialogOpen(true);
  };

  const openEditProvider = (provider: BackendProvider) => {
    setEditingProviderId(provider.id);
    setProviderDialogOpen(true);
  };

  const closeProviderDialog = () => {
    setProviderDialogOpen(false);
    setEditingProviderId(null);
    setSavingProvider(false);
  };

  const openDeleteProvider = (provider: BackendProvider) => {
    setProviderToDelete(provider.id);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setProviderToDelete(null);
  };

  const updateField = <K extends keyof ProviderForm>(key: K, value: ProviderForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveProvider = async () => {
    if (!form.nombre.trim()) {
      toast.error("El nombre del proveedor es requerido");
      return;
    }

    setSavingProvider(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        contacto_nombre: form.contacto_nombre.trim() || null,
        contacto_telefono: form.contacto_telefono.trim() || null,
        contacto_email: form.contacto_email.trim() || null,
        direccion: form.direccion.trim() || null,
        condicion_pago: form.condicion_pago.trim() || null,
        dias_credito: form.dias_credito.trim() ? Number(form.dias_credito) : null,
        activo: form.activo ? 1 : 0,
      };

      if (editingProviderId !== null) {
        await apiClient.actualizarProveedor(editingProviderId, payload);
        toast.success("Proveedor actualizado");
      } else {
        await apiClient.crearProveedor(payload);
        toast.success("Proveedor creado");
      }

      await providersQuery.refetch();
      closeProviderDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo guardar el proveedor"));
    } finally {
      setSavingProvider(false);
    }
  };

  const handleDeleteProvider = async () => {
    if (providerToDelete === null) return;
    setSavingProvider(true);
    try {
      await apiClient.eliminarProveedor(providerToDelete);
      toast.success("Proveedor eliminado");
      await providersQuery.refetch();
      closeDeleteDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo eliminar el proveedor"));
    } finally {
      setSavingProvider(false);
    }
  };

  const toggleProviderState = async (provider: BackendProvider) => {
    try {
      await apiClient.actualizarProveedor(provider.id, { activo: Number(provider.activo) === 1 ? 0 : 1 });
      toast.success(Number(provider.activo) === 1 ? "Proveedor inactivado" : "Proveedor activado");
      await providersQuery.refetch();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo actualizar el estado del proveedor"));
    }
  };

  const activeCount = providers.filter((provider) => Number(provider.activo) === 1).length;
  const inactiveCount = providers.length - activeCount;

  return (
    <>
      <PageHeader
        title="Proveedores"
        subtitle={`${providers.length} proveedores · ${activeCount} activos`}
        brand={false}
        right={
          <Button onClick={openCreateProvider} className="grid h-9 w-9 place-items-center rounded-full px-0 shadow-soft" size="icon" aria-label="Nuevo proveedor">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total</p>
            <p className="mt-2 text-2xl font-semibold">{providers.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Activos</p>
            <p className="mt-2 text-2xl font-semibold">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Inactivos</p>
            <p className="mt-2 text-2xl font-semibold">{inactiveCount}</p>
          </div>
        </section>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar proveedor, contacto o condición de pago..."
            className="w-full h-11 rounded-xl bg-secondary border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="scroll-x">
          {(providerStates.length > 0
            ? providerStates
            : [
                { codigo: "todos", etiqueta: "Todos", activo: null, cantidad: providers.length },
                { codigo: "activos", etiqueta: "Activos", activo: 1, cantidad: activeCount },
                { codigo: "inactivos", etiqueta: "Inactivos", activo: 0, cantidad: inactiveCount },
              ]
          ).map((item) => (
            <button
              key={item.codigo}
              onClick={() => {
                setFilter(item.codigo);
                setPage(1);
              }}
              className={cn(
                "chip capitalize flex items-center gap-2",
                filter === item.codigo ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              )}
            >
              <span>{item.etiqueta}</span>
              <span className="text-[10px] opacity-75">{item.cantidad}</span>
            </button>
          ))}
        </div>

        {providersQuery.isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-16 text-center shadow-soft">
            <LoadingSpinner size="md" variant="spin" text="Cargando proveedores..." />
          </div>
        ) : providersQuery.isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-center shadow-soft">
            <p className="text-sm font-medium text-destructive">No se pudieron cargar los proveedores.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {providersQuery.error instanceof Error ? providersQuery.error.message : "Verifica la conexión con el backend."}
            </p>
            <button
              onClick={() => providersQuery.refetch()}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border/60 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border/60">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Proveedor</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contacto</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ubicación</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Condición</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                          Sin proveedores.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((provider) => (
                        <tr key={provider.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-sm flex-shrink-0">
                                {getInitials(provider.nombre)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{provider.nombre}</p>
                                <p className="text-xs text-muted-foreground truncate">{provider.contacto_nombre || "Sin contacto"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm truncate">{provider.contacto_nombre || "Sin contacto"}</p>
                            <p className="text-xs text-muted-foreground truncate">{provider.contacto_email || provider.contacto_telefono || "Sin dato"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm truncate">{provider.direccion || "Sin dirección"}</p>
                            <p className="text-xs text-muted-foreground truncate">{provider.contacto_email || provider.contacto_telefono || "Sin dato"}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm truncate">{provider.condicion_pago || "Sin condición"}</p>
                            <p className="text-xs text-muted-foreground">
                              {provider.dias_credito !== null && provider.dias_credito !== undefined ? `${provider.dias_credito} días crédito` : "Sin crédito"}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Circle className={cn("h-2 w-2 fill-current", Number(provider.activo) === 1 ? "text-success" : "text-muted-foreground")} />
                              <span className="text-xs">{Number(provider.activo) === 1 ? "Activo" : "Inactivo"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openEditProvider(provider)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                title="Editar proveedor"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => toggleProviderState(provider)}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                title={Number(provider.activo) === 1 ? "Inactivar proveedor" : "Activar proveedor"}
                              >
                                <Circle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteProvider(provider)}
                                disabled={savingProvider}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                                title="Eliminar proveedor"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Pager page={page} totalPages={totalPages} onPrev={prev} onNext={next} onGo={setPage} />
            </div>
          </>
        )}
      </div>

      <Dialog open={providerDialogOpen} onOpenChange={(open) => (open ? setProviderDialogOpen(true) : closeProviderDialog())}>
        <DialogContent className="w-[min(96vw,48rem)] max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">{editingProviderId !== null ? "Editar proveedor" : "Nuevo proveedor"}</DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">
                {editingProviderId !== null ? "Actualiza los datos del proveedor sin salir de la lista." : "Crea un proveedor desde este modal flotante."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 space-y-3">
                <Field label="Nombre" value={form.nombre} onChange={(value) => updateField("nombre", value)} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Contacto" value={form.contacto_nombre} onChange={(value) => updateField("contacto_nombre", value)} />
                  <Field label="Teléfono" value={form.contacto_telefono} onChange={(value) => updateField("contacto_telefono", value)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Email" value={form.contacto_email} onChange={(value) => updateField("contacto_email", value)} type="email" />
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Dirección</label>
                    <Textarea value={form.direccion} onChange={(e) => updateField("direccion", e.target.value)} className="min-h-24" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Condición de pago" value={form.condicion_pago} onChange={(value) => updateField("condicion_pago", value)} />
                  <Field label="Días crédito" value={form.dias_credito} onChange={(value) => updateField("dias_credito", value)} type="number" />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Proveedor activo</p>
                    <p className="text-xs text-muted-foreground">Permite usarlo en compras e inventario</p>
                  </div>
                  <Switch checked={form.activo} onCheckedChange={(value) => updateField("activo", value)} />
                </div>
              </section>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-background px-6 py-4 gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeProviderDialog} disabled={savingProvider} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveProvider} disabled={savingProvider} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4" /> Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="w-[min(96vw,28rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Eliminar proveedor?</DialogTitle>
            <DialogDescription className="mt-2">Esta acción no se puede deshacer. El proveedor se eliminará permanentemente del sistema.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                closeDeleteDialog();
              }}
              disabled={savingProvider}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteProvider} disabled={savingProvider} className="flex-1 sm:flex-none">
              {savingProvider ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 h-11 rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
