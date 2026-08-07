import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Pencil, ShieldCheck, Trash2, KeyRound } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { AdminUsersSubnav } from "@/components/AdminUsersSubnav";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

type BackendRole = {
  id: number;
  nombre_rol: string;
  descripcion?: string | null;
};

type BackendPermission = {
  id: number;
  nombre_permiso: string;
  descripcion?: string | null;
  modulo?: string | null;
};

type RoleDetail = BackendRole & {
  permisos?: BackendPermission[];
};

const roleName = (value?: string | null) => String(value ?? "").trim();

const moduleLabels: Record<string, string> = {
  usuarios: "Usuarios",
  roles: "Roles",
  permisos: "Permisos",
  comandas: "Comandas",
  reportes: "Reportes",
  configuracion: "Configuración",
  inventario: "Inventario",
  productos: "Productos",
  mesas: "Mesas",
  clientes: "Clientes",
  proveedores: "Proveedores",
  compras: "Compras",
  pagos: "Pagos",
  cocina: "Cocina",
};

function moduleName(value?: string | null) {
  const key = String(value ?? "").trim().toLowerCase();
  return moduleLabels[key] ?? (key ? key.charAt(0).toUpperCase() + key.slice(1) : "Sin módulo");
}

function formatPermissionName(value: string) {
  return value
    .trim()
    .split("_")
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    return message || fallback;
  }
  return fallback;
}

export default function AdminRoles() {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [deleteRoleOpen, setDeleteRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<BackendRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<BackendRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<number[]>([]);
  const [savingRole, setSavingRole] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [deletingRole, setDeletingRole] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const rolesQuery = useQuery({
    queryKey: ["admin-roles"],
    queryFn: async () => apiClient.listarRoles(0, 500) as Promise<BackendRole[]>,
    staleTime: 30_000,
  });

  const permissionsQuery = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: async () => apiClient.listarPermisos(0, 500) as Promise<BackendPermission[]>,
    staleTime: 30_000,
  });

  const roleDetailQuery = useQuery({
    queryKey: ["admin-role-detail", selectedRoleId],
    enabled: permissionsOpen && selectedRoleId !== null,
    queryFn: async () => apiClient.obtenerRol(selectedRoleId as number) as Promise<RoleDetail>,
  });

  useEffect(() => {
    if (!roleDialogOpen) return;
    setName(editingRole?.nombre_rol ?? "");
    setDescription(editingRole?.descripcion ?? "");
  }, [editingRole, roleDialogOpen]);

  useEffect(() => {
    if (!permissionsOpen || !roleDetailQuery.data) return;
    setSelectedPermissionIds((roleDetailQuery.data.permisos ?? []).map((permiso) => permiso.id));
  }, [permissionsOpen, roleDetailQuery.data]);

  const roles = useMemo(() => rolesQuery.data ?? [], [rolesQuery.data]);
  const permissions = useMemo(() => permissionsQuery.data ?? [], [permissionsQuery.data]);
  const permissionsByModule = useMemo(() => {
    const grouped = permissions.reduce<Record<string, BackendPermission[]>>((acc, permission) => {
      const key = String(permission.modulo ?? "").trim().toLowerCase() || "sin-modulo";
      if (!acc[key]) acc[key] = [];
      acc[key].push(permission);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([module, items]) => ({
        module,
        label: module === "sin-modulo" ? "Sin módulo" : moduleName(module),
        items: items.sort((a, b) => a.nombre_permiso.localeCompare(b.nombre_permiso, "es")),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [permissions]);
  const currentRole = roleDetailQuery.data ?? null;

  const openCreateRole = () => {
    setEditingRole(null);
    setName("");
    setDescription("");
    setRoleDialogOpen(true);
  };

  const openEditRole = (role: BackendRole) => {
    setEditingRole(role);
    setRoleDialogOpen(true);
  };

  const openPermissions = (roleId: number) => {
    setSelectedRoleId(roleId);
    setPermissionsOpen(true);
  };

  const closeRoleDialog = () => {
    setRoleDialogOpen(false);
    setEditingRole(null);
  };

  const closePermissionsDialog = () => {
    setPermissionsOpen(false);
    setSelectedRoleId(null);
    setSelectedPermissionIds([]);
  };

  const openDeleteRole = (role: BackendRole) => {
    setRoleToDelete(role);
    setDeleteRoleOpen(true);
  };

  const closeDeleteRoleDialog = () => {
    setDeleteRoleOpen(false);
    setRoleToDelete(null);
  };

  const handleSaveRole = async () => {
    if (!name.trim()) {
      toast.error("El nombre del rol es requerido");
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await apiClient.actualizarRol(editingRole.id, {
          nombre_rol: name.trim(),
          descripcion: description.trim() || null,
        });
        toast.success("Rol actualizado");
      } else {
        const created = await apiClient.crearRol({
          nombre_rol: name.trim(),
          descripcion: description.trim() || null,
        });
        const createdId = Number((created as { id?: number }).id);
        if (Number.isFinite(createdId)) {
          setSelectedRoleId(createdId);
          setPermissionsOpen(true);
        }
        toast.success("Rol creado");
      }

      await rolesQuery.refetch();
      closeRoleDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo guardar el rol"));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      await apiClient.eliminarRol(roleToDelete.id);
      toast.success("Rol eliminado");
      await rolesQuery.refetch();
      closeDeleteRoleDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo eliminar el rol"));
    } finally {
      setDeletingRole(false);
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissionIds((current) =>
      current.includes(permissionId)
        ? current.filter((id) => id !== permissionId)
        : [...current, permissionId]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId) return;
    const currentIds = new Set((currentRole?.permisos ?? []).map((permiso) => permiso.id));
    const nextIds = new Set(selectedPermissionIds);

    setSavingPermissions(true);
    try {
      const removeOps = Array.from(currentIds)
        .filter((permissionId) => !nextIds.has(permissionId))
        .map((permissionId) => apiClient.removerPermisoDeRol(selectedRoleId, permissionId));

      const addOps = Array.from(nextIds)
        .filter((permissionId) => !currentIds.has(permissionId))
        .map((permissionId) => apiClient.asignarPermisoARol(selectedRoleId, permissionId));

      await Promise.all([...removeOps, ...addOps]);
      toast.success("Permisos actualizados");
      await rolesQuery.refetch();
      await roleDetailQuery.refetch();
      closePermissionsDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudieron guardar los permisos"));
    } finally {
      setSavingPermissions(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles"
        subtitle="Gestiona cuentas, roles y permisos desde un solo lugar"
        brand={false}
        right={
          <Button onClick={openCreateRole} className="h-9 rounded-full px-4">
            <Plus className="mr-2 h-4 w-4" /> Nuevo rol
          </Button>
        }
      />

      <AdminUsersSubnav />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Roles</p>
            <p className="mt-2 text-2xl font-semibold">{roles.length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Permisos</p>
            <p className="mt-2 text-2xl font-semibold">{permissions.length}</p>
          </div>
        </section>

        {rolesQuery.isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-16 text-center shadow-soft">
            <LoadingSpinner size="md" variant="spin" text="Cargando roles..." />
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <article key={role.id} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold">{roleName(role.nombre_rol)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{role.descripcion || "Sin descripción"}</p>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditRole(role)}
                    className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    onClick={() => openPermissions(role.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Permisos
                  </button>
                  <button
                    onClick={() => openDeleteRole(role)}
                    className="inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/15"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,40rem)] flex-col overflow-hidden p-0 sm:max-w-xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">{editingRole ? "Editar rol" : "Nuevo rol"}</DialogTitle>
              <DialogDescription className="mt-1">
                El rol se crea sin permisos para que puedas asignarlos después desde el modal flotante.
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Nombre del rol</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Supervisor" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Descripción</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" className="min-h-24" />
              </div>
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4 gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={closeRoleDialog} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={savingRole} className="w-full sm:w-auto">
              {savingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsOpen} onOpenChange={setPermissionsOpen}>
        <DialogContent className="flex max-h-[90vh] w-[min(96vw,56rem)] flex-col overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">Permisos del rol</DialogTitle>
              <DialogDescription className="mt-1">
                {currentRole ? roleName(currentRole.nombre_rol) : "Selecciona un rol"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 pr-3 space-y-4">
            {permissionsQuery.isLoading ? (
              <div className="py-8 flex justify-center">
                <LoadingSpinner size="md" variant="dots" text="Cargando permisos..." />
              </div>
            ) : (
              permissionsByModule.map((group) => (
                <section key={group.module} className="rounded-2xl border border-border/60 bg-card p-4 shadow-soft space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{group.label}</p>
                      <p className="text-xs text-muted-foreground">{group.items.length} permisos</p>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-1 text-[10px] uppercase tracking-wider text-secondary-foreground">
                      {group.module === "sin-modulo" ? "Sin módulo" : group.module}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((permission) => {
                      const checked = selectedPermissionIds.includes(permission.id);
                      return (
                        <label
                          key={permission.id}
                          className={cn(
                            "flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition-colors",
                            checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                          )}
                        >
                          <Checkbox checked={checked} onCheckedChange={() => togglePermission(permission.id)} className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{formatPermissionName(permission.nombre_permiso)}</p>
                            <p className="text-xs text-muted-foreground">{permission.descripcion || "Sin descripción"}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>

          <DialogFooter className="sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4 gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={closePermissionsDialog} className="w-full sm:w-auto">Cerrar</Button>
            <Button onClick={handleSavePermissions} disabled={savingPermissions || !selectedRoleId} className="w-full sm:w-auto">
              {savingPermissions ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar permisos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteRoleOpen} onOpenChange={setDeleteRoleOpen}>
        <DialogContent className="w-[min(96vw,32rem)] p-0 sm:max-w-md">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">Eliminar rol</DialogTitle>
              <DialogDescription className="mt-1">
                {roleToDelete ? `¿Seguro que deseas eliminar el rol ${roleToDelete.nombre_rol}?` : "Confirma la eliminación del rol seleccionado."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="px-6 py-5">
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. Si el rol tiene usuarios asociados, revisa antes de continuar.
            </p>
          </div>

          <DialogFooter className="border-t border-border/60 bg-background px-6 py-4 gap-2 sm:flex-row sm:justify-end sm:gap-2">
            <Button variant="outline" onClick={closeDeleteRoleDialog} disabled={deletingRole} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={deletingRole || !roleToDelete} className="w-full sm:w-auto">
              {deletingRole ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Eliminar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}