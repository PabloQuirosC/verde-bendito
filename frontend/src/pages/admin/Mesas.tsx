import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, Users, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/context/session";
import { useStore } from "@/store/useStore";

const zones = ["Salón", "Terraza", "Barra"] as const;

const statusStyles: Record<string, { dot: string; bg: string; text: string; label: string }> = {
  disponible:  { dot: "bg-success", bg: "bg-card", text: "text-success", label: "Disponible" },
  ocupada:  { dot: "bg-primary", bg: "bg-primary/5", text: "text-primary", label: "Ocupada" },
  reservada:   { dot: "bg-warning", bg: "bg-warning/10", text: "text-warning-foreground", label: "Reservada" },
  mantenimiento: { dot: "bg-muted-foreground", bg: "bg-muted", text: "text-muted-foreground", label: "Mantenimiento" },
};

const isAdminRole = (role?: string | null) => {
  const normalized = String(role ?? "").trim().toLowerCase();
  return normalized === "admin" || normalized === "administrador" || normalized === "gerente";
};

const canManageMesas = (role?: string | null) => {
  const normalized = String(role ?? "").trim().toLowerCase();
  // Permitir a admin, gerente, y mesero gestionar mesas
  return normalized === "admin" || normalized === "administrador" || normalized === "gerente" || normalized === "mesero";
};

export default function AdminMesas() {
  const { tables, currentUserRole, loadTables, apiCreateTable, apiUpdateTable, apiDeleteTable } = useStore();
  const { role: sessionRole, authUser } = useSession();
  const [zone, setZone] = useState<typeof zones[number]>("Salón");
  const [view, setView] = useState<"map" | "list">("map");
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<{ id: string; number: number } | null>(null);
  const isAdmin = isAdminRole(sessionRole) || authUser?.roles?.some((r) => isAdminRole(r)) || isAdminRole(currentUserRole);
  const canCreate = canManageMesas(sessionRole) || authUser?.roles?.some((r) => canManageMesas(r)) || canManageMesas(currentUserRole);

  useEffect(() => {
    loadMesas();
  }, []);

  const loadMesas = async () => {
    setLoading(true);
    await loadTables();
    setLoading(false);
  };

  // Filtrar mesas por ubicación (asumiendo que la ubicación está en el campo zone del frontend)
  // Por ahora, mostrar todas ya que el backend no devuelve zona
  const filtered = tables;

  const counts = {
    disponibles: tables.filter((t) => t.status === "libre").length,
    ocupadas: tables.filter((t) => t.status === "ocupada").length,
    mantenimiento: 0, // No tenemos datos de esto desde el API aún
  };

  const handleDelete = (id: string, number: number) => {
    setTableToDelete({ id, number });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!tableToDelete) return;
    const success = await apiDeleteTable(Number(tableToDelete.id));
    if (success) {
      toast.success(`Mesa ${tableToDelete.number} eliminada`);
    } else {
      toast.error("Error al eliminar la mesa");
    }
    setDeleteDialogOpen(false);
    setTableToDelete(null);
  };

  return (
    <>
      <PageHeader
        title="Gestión de mesas"
        subtitle={`${tables.length} mesas · ${counts.disponibles} disponibles`}
        brand={false}
        right={
          <div className="flex items-center gap-1.5">
            {canCreate && (
              <NewTableDialog onCreate={async (tableData) => {
                const success = await apiCreateTable({
                  numero: tableData.number,
                  capacidad: tableData.seats,
                  ubicacion: tableData.zone,
                  estado: "disponible",
                });
                if (success) {
                  toast.success(`Mesa ${tableData.number} creada`);
                  return true;
                }
                toast.error("Error al crear la mesa");
                return false;
              }} />
            )}
            <div className="flex items-center gap-1 rounded-full bg-secondary p-1">
              <button onClick={() => setView("map")} className={cn("grid h-8 w-8 place-items-center rounded-full", view === "map" && "bg-card shadow-soft")}>
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button onClick={() => setView("list")} className={cn("grid h-8 w-8 place-items-center rounded-full", view === "list" && "bg-card shadow-soft")}>
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      />

      <section className="px-4 mt-2 grid grid-cols-3 gap-2">
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-success">{counts.disponibles}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Disponibles</p>
        </div>
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-primary">{counts.ocupadas}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Ocupadas</p>
        </div>
        <div className="stat-card text-center">
          <p className="font-display text-2xl text-muted-foreground">{tables.length}</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total</p>
        </div>
      </section>

      <div className={cn("px-4 mt-4 pb-6", view === "map" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" : "space-y-2")}>
        {loading ? (
          <div className="col-span-full py-16 flex justify-center">
            <LoadingSpinner size="md" variant="spin" text="Cargando mesas..." />
          </div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full text-center py-8 text-muted-foreground">No hay mesas creadas</div>
        ) : (
          filtered.map((t) => {
            const s = statusStyles[t.status === "libre" ? "disponible" : t.status === "ocupada" ? "ocupada" : "disponible"];
            if (view === "list") {
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3 border border-border/60 shadow-soft"
                >
                  <div className={cn("grid h-12 w-12 place-items-center rounded-xl font-display text-lg", s.bg, s.text)}>
                    {t.number.toString().padStart(2, "0")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Mesa {t.number} <span className="text-muted-foreground font-normal">· {t.capacity || "?"} pax</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                      {s.label}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <EditTableDialog
                        table={t}
                        onUpdate={async (data) => {
                          const success = await apiUpdateTable(Number(t.id), {
                            numero: data.number,
                            capacidad: data.seats,
                            ubicacion: data.zone,
                            estado: data.estado,
                          });
                          if (success) {
                            toast.success("Mesa actualizada");
                            return true;
                          }
                          toast.error("Error al actualizar");
                          return false;
                        }}
                      />
                      <button
                        onClick={() => handleDelete(t.id, t.number)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div
                key={t.id}
                className={cn(
                  "rounded-2xl border p-3 shadow-soft flex flex-col justify-between",
                  s.bg,
                  t.status === "ocupada" ? "border-primary/20" : "border-border/60"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("chip text-[10px] uppercase tracking-wider", s.bg, s.text)}>
                    <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
                    {s.label}
                  </span>
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Users className="h-3 w-3" /> {t.capacity || "?"}
                  </span>
                </div>
                <p className="font-display text-3xl mt-3">{t.number.toString().padStart(2, "0")}</p>
                {isAdmin && (
                  <div className="mt-3 flex gap-2">
                    <EditTableDialog
                      table={t}
                      onUpdate={async (data) => {
                        const success = await apiUpdateTable(Number(t.id), {
                          numero: data.number,
                          capacidad: data.seats,
                          ubicacion: data.zone,
                          estado: data.estado,
                        });
                        if (success) {
                          toast.success("Mesa actualizada");
                          return true;
                        }
                        toast.error("Error al actualizar");
                        return false;
                      }}
                    />
                    <button
                      onClick={() => handleDelete(t.id, t.number)}
                      className="flex-1 p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4 mx-auto" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar mesa</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar la mesa {tableToDelete?.number}? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NewTableDialog({ onCreate }: { onCreate: (t: { number: number; seats: number; zone: typeof zones[number] }) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(11);
  const [seats, setSeats] = useState(4);
  const [zone, setZone] = useState<typeof zones[number]>("Salón");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft" aria-label="Agregar mesa">
          <Plus className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Nueva mesa</DialogTitle>
          <DialogDescription>Agrega una mesa al sistema.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input type="number" min={1} value={number} onChange={(e) => setNumber(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Personas</Label>
            <Input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label>Zona</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as typeof zones[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button
            disabled={number < 1 || seats < 1 || saving}
            onClick={async () => {
              setSaving(true);
              if (await onCreate({ number, seats, zone })) {
                setOpen(false);
              }
              setSaving(false);
            }}
          >
            {saving ? "Creando..." : "Crear mesa"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditTableDialog({
  table,
  onUpdate,
}: {
  table: { number: number; capacity?: number; zone?: typeof zones[number]; status: string };
  onUpdate: (t: { number: number; seats: number; zone: typeof zones[number]; estado: string }) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(table.number);
  const [seats, setSeats] = useState(table.capacity || 4);
  const [zone, setZone] = useState<typeof zones[number]>(table.zone || "Salón");
  const [estado, setEstado] = useState(table.status === "libre" ? "disponible" : "ocupada");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition" title="Editar">
          <Edit className="h-4 w-4" />
        </button>
      </DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Editar mesa</DialogTitle>
          <DialogDescription>Actualiza los datos de la mesa.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Número</Label>
            <Input type="number" min={1} value={number} onChange={(e) => setNumber(parseInt(e.target.value) || 0)} />
          </div>
          <div className="space-y-1.5">
            <Label>Personas</Label>
            <Input type="number" min={1} max={20} value={seats} onChange={(e) => setSeats(parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1.5">
            <Label>Zona</Label>
            <Select value={zone} onValueChange={(v) => setZone(v as typeof zones[number])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => <SelectItem key={z} value={z}>{z}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="ocupada">Ocupada</SelectItem>
                <SelectItem value="reservada">Reservada</SelectItem>
                <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button
            disabled={number < 1 || seats < 1 || saving}
            onClick={async () => {
              setSaving(true);
              if (await onUpdate({ number, seats, zone, estado })) {
                setOpen(false);
              }
              setSaving(false);
            }}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
