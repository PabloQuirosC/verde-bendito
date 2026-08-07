import { useEffect, useMemo, useState } from "react";
import { Edit, Loader2, Plus, RefreshCw, Search, Trash2, Mail, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { Pager } from "@/components/Pager";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Cliente = {
  id: number;
  nombre: string;
  apellido?: string | null;
  email?: string | null;
  telefono?: string | null;
  cedula_ruc?: string | null;
  saldo_credito?: number | null;
};

type ClienteForm = {
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  cedula_ruc: string;
};

function emptyForm(cliente?: Cliente | null): ClienteForm {
  return {
    nombre: cliente?.nombre ?? "",
    apellido: cliente?.apellido ?? "",
    email: cliente?.email ?? "",
    telefono: cliente?.telefono ?? "",
    cedula_ruc: cliente?.cedula_ruc ?? "",
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

export default function AdminClientes() {
  const [q, setQ] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [clienteDialogOpen, setClienteDialogOpen] = useState(false);
  const [editingClienteId, setEditingClienteId] = useState<number | null>(null);
  const [form, setForm] = useState<ClienteForm>(emptyForm());
  const [savingCliente, setSavingCliente] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clienteToDelete, setClienteToDelete] = useState<number | null>(null);

  const clientesQuery = useQuery({
    queryKey: ["admin-clientes"],
    queryFn: async () => {
      const response = await apiClient.listarClientes(0, 500);
      const data = response?.data ?? response;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });

  const clientes = useMemo(() => {
    const data = clientesQuery.data ?? [];
    return data.filter((c: Cliente) =>
      !q ||
      c.nombre?.toLowerCase().includes(q.toLowerCase()) ||
      c.apellido?.toLowerCase().includes(q.toLowerCase()) ||
      c.email?.toLowerCase().includes(q.toLowerCase()) ||
      c.cedula_ruc?.toLowerCase().includes(q.toLowerCase())
    );
  }, [clientesQuery.data, q]);

  const pageSize = 10;
  const pageCount = Math.ceil((clientes?.length ?? 0) / pageSize);
  const page = clientes?.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize) ?? [];

  const handleNewCliente = () => {
    setEditingClienteId(null);
    setForm(emptyForm());
    setClienteDialogOpen(true);
  };

  const handleEditCliente = async (clienteId: number) => {
    try {
      const response = await apiClient.obtenerCliente(clienteId);
      const cliente = response?.data ?? response;
      setEditingClienteId(clienteId);
      setForm(emptyForm(cliente));
      setClienteDialogOpen(true);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al cargar cliente"));
    }
  };

  const handleSaveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSavingCliente(true);
    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim() || null,
        email: form.email.trim() || null,
        telefono: form.telefono.trim() || null,
        cedula_ruc: form.cedula_ruc.trim() || null,
      };

      if (editingClienteId) {
        await apiClient.actualizarCliente(editingClienteId, payload);
        toast.success("Cliente actualizado");
      } else {
        await apiClient.crearCliente(payload);
        toast.success("Cliente creado");
      }

      clientesQuery.refetch();
      setClienteDialogOpen(false);
      setForm(emptyForm());
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al guardar cliente"));
    } finally {
      setSavingCliente(false);
    }
  };

  const handleDeleteCliente = async () => {
    if (!clienteToDelete) return;

    try {
      await apiClient.eliminarCliente(clienteToDelete);
      toast.success("Cliente eliminado");
      clientesQuery.refetch();
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Error al eliminar cliente"));
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gestiona todos los clientes del sistema"
        right={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => clientesQuery.refetch()}
              disabled={clientesQuery.isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleNewCliente}>
              <Plus className="h-4 w-4 mr-1" /> Nuevo Cliente
            </Button>
          </div>
        }
      />

      <div className="px-4 pb-8 space-y-4">
        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o cédula..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Lista de clientes */}
        {clientesQuery.isLoading ? (
          <div className="text-center py-12">
            <LoadingSpinner size="md" variant="spin" text="Cargando clientes..." />
          </div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay clientes registrados
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {page.map((cliente: Cliente) => (
                <div
                  key={cliente.id}
                  className="rounded-lg border border-border/60 bg-card p-4 flex items-center justify-between hover:bg-card/80 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {getInitials(`${cliente.nombre} ${cliente.apellido || ""}`)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {cliente.nombre} {cliente.apellido || ""}
                      </p>
                      <div className="flex flex-wrap gap-3 mt-1">
                        {cliente.email && (
                          <a
                            href={`mailto:${cliente.email}`}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
                          >
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{cliente.email}</span>
                          </a>
                        )}
                        {cliente.telefono && (
                          <a
                            href={`tel:${cliente.telefono}`}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            {cliente.telefono}
                          </a>
                        )}
                        {cliente.cedula_ruc && (
                          <span className="text-xs text-muted-foreground">
                            Cédula: {cliente.cedula_ruc}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Saldo de crédito */}
                    {cliente.saldo_credito !== undefined && cliente.saldo_credito !== null && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-muted-foreground">Crédito</p>
                        <p className={cn("font-semibold", cliente.saldo_credito > 0 ? "text-warning" : "text-muted-foreground")}>
                          ₡{(cliente.saldo_credito || 0).toLocaleString("es-CR")}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditCliente(cliente.id)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setClienteToDelete(cliente.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {pageCount > 1 && (
              <Pager
                page={pageIndex}
                pageCount={pageCount}
                onPageChange={setPageIndex}
              />
            )}
          </>
        )}
      </div>

      {/* Dialog: Crear/Editar Cliente */}
      <Dialog open={clienteDialogOpen} onOpenChange={setClienteDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingClienteId ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingClienteId ? "Modifica los datos del cliente" : "Agrega un nuevo cliente al sistema"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCliente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  placeholder="Juan"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  placeholder="Pérez"
                  value={form.apellido}
                  onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="juan@ejemplo.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  placeholder="+506 8888 8888"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cedula">Cédula/RUC</Label>
                <Input
                  id="cedula"
                  placeholder="1-2345-6789"
                  value={form.cedula_ruc}
                  onChange={(e) => setForm({ ...form, cedula_ruc: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setClienteDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={savingCliente}>
                {savingCliente ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar Cliente</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteCliente}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
