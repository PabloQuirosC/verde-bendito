import { useEffect, useMemo, useState } from "react";
import { Circle, Edit, Loader2, Plus, RefreshCw, Save, Search, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { PageHeader } from "@/components/PageHeader";
import { roleLabels, type Role } from "@/data/mock";
import { cn } from "@/lib/utils";
import { usePagination } from "@/hooks/use-pagination";
import { Pager } from "@/components/Pager";
import { apiClient } from "@/lib/api";
import { AdminUsersSubnav } from "@/components/AdminUsersSubnav";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

type BackendRole = {
  id: number;
  nombre_rol?: string;
  nombre?: string;
};

type BackendUser = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  nombre_usuario: string;
  pais: string;
  activo: number;
  fecha_ultimo_login?: string | null;
  rol?: BackendRole | null;
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  username: string;
  roleId: string;
  roleName: string;
  active: boolean;
  lastSeen: string;
};

type UserFormValues = {
  name: string;
  surname: string;
  email: string;
  username: string;
  country: string;
  password: string;
  active: boolean;
  selectedRoleId: string;
};

const roleAliases: Record<string, Role> = {
  administrador: "admin",
  admin: "admin",
  gerente: "admin",
  mesero: "mesero",
  waiter: "mesero",
  cocinero: "cocina",
  cocina: "cocina",
  chef: "cocina",
  cajero: "cajero",
  caja: "cajero",
};

function normalizeRole(value?: string | null): Role | null {
  const key = String(value ?? "").trim().toLowerCase();
  return roleAliases[key] ?? null;
}

function formatLastSeen(value?: string | null) {
  if (!value) return "Sin registro";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapUser(user: BackendUser): UserItem {
  const role = normalizeRole(user.rol?.nombre_rol ?? user.rol?.nombre);
  const roleName = String(user.rol?.nombre_rol ?? user.rol?.nombre ?? "").trim();

  return {
    id: String(user.id),
    name: `${user.nombre} ${user.apellido}`.trim(),
    email: user.email,
    username: user.nombre_usuario,
    roleId: String(user.rol?.id ?? ""),
    roleName: role ? roleLabels[role] : roleName,
    active: Number(user.activo) === 1,
    lastSeen: formatLastSeen(user.fecha_ultimo_login),
  };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = String((error as { message?: unknown }).message ?? "").trim();
    return message || fallback;
  }
  return fallback;
}

function emptyForm(roleId = ""): UserFormValues {
  return {
    name: "",
    surname: "",
    email: "",
    username: "",
    country: "CR",
    password: "",
    active: true,
    selectedRoleId: roleId,
  };
}

export default function AdminUsuarios() {
  const [filter, setFilter] = useState<string | "Todos">("Todos");
  const [q, setQ] = useState("");
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<UserFormValues>(emptyForm());
  const [savingUser, setSavingUser] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => apiClient.listarUsuarios(0, 500),
    staleTime: 30_000,
  });

  const rolesQuery = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => apiClient.listarRoles(0, 100) as Promise<BackendRole[]>,
    staleTime: 60_000,
  });

  const userDetailQuery = useQuery({
    queryKey: ["admin-user-detail", editingUserId],
    enabled: userDialogOpen && editingUserId !== null,
    queryFn: async () => apiClient.obtenerUsuario(editingUserId as number) as Promise<BackendUser>,
  });

  const users = useMemo(() => {
    const list = Array.isArray(data) ? data : [];
    return list.map((item) => mapUser(item as BackendUser));
  }, [data]);

  const roleOptions = useMemo(
    () =>
      (rolesQuery.data ?? []).map((role) => {
        const normalized = normalizeRole(role.nombre_rol ?? role.nombre);
        return {
          id: String(role.id),
          label: normalized ? roleLabels[normalized] : role.nombre_rol ?? role.nombre ?? `Rol ${role.id}`,
        };
      }),
    [rolesQuery.data]
  );

  const roleOptionsById = useMemo(
    () => new Map(roleOptions.map((role) => [role.id, role.label] as const)),
    [roleOptions]
  );

  const filterOptions = useMemo(
    () => [{ id: "Todos", label: "Todos" }, ...roleOptions],
    [roleOptions]
  );

  const list = useMemo(
    () =>
      users.filter((u) => {
        if (filter !== "Todos" && u.roleId !== filter) return false;
        if (q) {
          const query = q.toLowerCase();
          const haystack = [u.name, u.username, u.email, u.roleName].join(" ").toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        return true;
      }),
    [filter, q, users]
  );

  const { page, setPage, totalPages, pageItems, next, prev } = usePagination(list, 4);
  const activeCount = users.filter((u) => u.active).length;
  const selectedRoleLabel = roleOptions.find((role) => role.id === form.selectedRoleId)?.label;

  useEffect(() => {
    if (!userDialogOpen) return;

    if (editingUserId === null) {
      setForm((current) => ({
        ...emptyForm(roleOptions[0]?.id ?? current.selectedRoleId),
      }));
      return;
    }

    if (!userDetailQuery.data) return;

    const currentRoleId = userDetailQuery.data.rol?.id ? String(userDetailQuery.data.rol.id) : "";

    setForm({
      name: userDetailQuery.data.nombre ?? "",
      surname: userDetailQuery.data.apellido ?? "",
      email: userDetailQuery.data.email ?? "",
      username: userDetailQuery.data.nombre_usuario ?? "",
      country: userDetailQuery.data.pais ?? "CR",
      password: "",
      active: Number(userDetailQuery.data.activo) === 1,
      selectedRoleId: currentRoleId || (roleOptions[0]?.id ?? ""),
    });
  }, [editingUserId, roleOptions, userDialogOpen, userDetailQuery.data]);

  useEffect(() => {
    if (!userDialogOpen || editingUserId !== null) return;
    if (!form.selectedRoleId && roleOptions.length > 0) {
      setForm((current) => ({ ...current, selectedRoleId: roleOptions[0].id }));
    }
  }, [editingUserId, form.selectedRoleId, roleOptions, userDialogOpen]);

  const openCreateUser = () => {
    setEditingUserId(null);
    setForm(emptyForm(roleOptions[0]?.id ?? ""));
    setUserDialogOpen(true);
  };

  const openEditUser = (userId: number) => {
    // keep backward-compat: open modal when called directly
    setEditingUserId(userId);
    setUserDialogOpen(true);
  };

  const closeUserDialog = () => {
    setUserDialogOpen(false);
    setEditingUserId(null);
    setSavingUser(false);
  };

  const updateField = <K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveUser = async () => {
    if (!form.name.trim() || !form.surname.trim() || !form.email.trim() || !form.username.trim() || !form.country.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    const trimmedPassword = form.password.trim();

    if (form.country.trim().length < 2 || form.country.trim().length > 10) {
      toast.error("El código de país debe tener entre 2 y 10 caracteres");
      return;
    }

    if (editingUserId === null && !trimmedPassword) {
      toast.error("La contraseña es obligatoria para un usuario nuevo");
      return;
    }

    if (trimmedPassword && trimmedPassword.length < 4) {
      toast.error("La contraseña debe tener al menos 4 caracteres");
      return;
    }

    if (!form.selectedRoleId) {
      toast.error("Selecciona un rol");
      return;
    }

    setSavingUser(true);
    try {
      const payload: Record<string, unknown> = {
        nombre: form.name.trim(),
        apellido: form.surname.trim(),
        email: form.email.trim(),
        nombre_usuario: form.username.trim(),
        pais: form.country.trim(),
        activo: form.active ? 1 : 0,
      };

      if (trimmedPassword) {
        payload.contrasena = trimmedPassword;
      }

      if (editingUserId !== null) {
        await apiClient.actualizarUsuario(editingUserId, payload);
        await apiClient.asignarRolAUsuario(editingUserId, Number(form.selectedRoleId));
        toast.success("Usuario actualizado");
      } else {
        const payload_create = {
          nombre: form.name.trim(),
          apellido: form.surname.trim(),
          email: form.email.trim(),
          nombre_usuario: form.username.trim(),
          pais: form.country.trim(),
          activo: form.active ? 1 : 0,
          contrasena: trimmedPassword,
        };
        const created = await apiClient.crearUsuario(payload_create);
        const createdId = Number((created as { id?: number }).id);
        if (Number.isFinite(createdId)) {
          await apiClient.asignarRolAUsuario(createdId, Number(form.selectedRoleId));
        }
        toast.success("Usuario creado");
      }

      await refetch();
      if (editingUserId !== null) {
        await userDetailQuery.refetch();
      }
      closeUserDialog();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo guardar el usuario"));
    } finally {
      setSavingUser(false);
    }
  };


  const handleDeleteUserFromList = (userId: number) => {
    setUserToDelete(userId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (userToDelete === null) return;
    setSavingUser(true);
    try {
      await apiClient.eliminarUsuario(userToDelete);
      toast.success("Usuario eliminado");
      await refetch();
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo eliminar el usuario"));
    } finally {
      setSavingUser(false);
    }
  };

  const handleResetPassword = async () => {
    if (editingUserId === null) return;
    try {
      const response = await apiClient.resetearContraseña(editingUserId);
      toast.success(response?.message || "Contraseña reseteada");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "No se pudo resetear la contraseña"));
    }
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} cuentas · ${activeCount} activas`}
        brand={false}
        right={
          <Button onClick={openCreateUser} className="grid h-9 w-9 place-items-center rounded-full px-0 shadow-soft" size="icon" aria-label="Nuevo usuario">
            <Plus className="h-4 w-4" />
          </Button>
        }
      />

      <AdminUsersSubnav />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por usuario, rol o correo..."
            className="w-full h-11 rounded-xl bg-secondary border-0 pl-10 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="scroll-x">
          {filterOptions.map((role) => (
            <button key={role.id} onClick={() => setFilter(role.id)} className={cn("chip capitalize", filter === role.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground") }>
              {role.label}
            </button>
          ))}
        </div>

        {isFetching && !isLoading && (
          <p className="text-[11px] text-muted-foreground text-center">Actualizando usuarios…</p>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-border/60 bg-card px-4 py-16 text-center shadow-soft">
            <LoadingSpinner size="md" variant="spin" text="Cargando usuarios..." />
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-5 text-center shadow-soft">
            <p className="text-sm font-medium text-destructive">No se pudieron cargar los usuarios.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : "Verifica la conexión con el backend."}
            </p>
            <button
              onClick={() => refetch()}
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
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usuario</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rol</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Último acceso</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-sm text-muted-foreground">
                          Sin usuarios.
                        </td>
                      </tr>
                    ) : (
                      pageItems.map((u) => (
                        <tr key={u.id} className="border-b border-border/60 hover:bg-secondary/30 transition">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-warm font-display text-sm flex-shrink-0">
                                {getInitials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{u.name}</p>
                                <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm truncate">{u.email}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.roleId ? (
                                <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                  {roleOptionsById.get(u.roleId) ?? u.roleName}
                                </span>
                              ) : (
                                <span className="text-xs uppercase tracking-wider px-2 py-1 rounded-full bg-secondary text-secondary-foreground">
                                  Sin rol
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Circle className={cn("h-2 w-2 fill-current", u.active ? "text-success" : "text-muted-foreground")} />
                              <span className="text-xs">{u.active ? "Activo" : "Inactivo"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-xs text-muted-foreground">{u.lastSeen}</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openEditUser(Number(u.id))}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition"
                                title="Editar usuario"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUserFromList(Number(u.id))}
                                disabled={savingUser}
                                className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition disabled:opacity-50"
                                title="Eliminar usuario"
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

      <Dialog open={userDialogOpen} onOpenChange={(open) => (open ? setUserDialogOpen(true) : closeUserDialog())}>
        <DialogContent className="w-[min(96vw,56rem)] max-h-[90vh] overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader>
            <div className="border-b border-border/60 bg-gradient-to-br from-background to-secondary/30 px-6 py-5 text-left">
              <DialogTitle className="text-xl">
                {editingUserId !== null ? "Editar usuario" : "Nuevo usuario"}
              </DialogTitle>
              <DialogDescription className="mt-1 max-w-2xl">
                {editingUserId !== null
                  ? "Ajusta los datos del usuario sin salir de la lista."
                  : "Crea una cuenta de personal desde este modal flotante."}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-12rem)] overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              {editingUserId !== null && userDetailQuery.isLoading ? (
                <div className="rounded-2xl border border-border/60 bg-card px-4 py-8 text-center shadow-soft">
                  <LoadingSpinner size="md" variant="dots" text="Cargando datos..." />
                </div>
              ) : null}

              <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Nombre" value={form.name} onChange={(value) => updateField("name", value)} />
                  <Field label="Apellido" value={form.surname} onChange={(value) => updateField("surname", value)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Correo" value={form.email} onChange={(value) => updateField("email", value)} type="email" />
                  <Field label="Usuario" value={form.username} onChange={(value) => updateField("username", value)} />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="País" value={form.country} onChange={(value) => updateField("country", value)} />
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Contraseña</label>
                    <div className="mt-1.5 flex gap-2">
                      <input
                        type="password"
                        value={editingUserId !== null ? "••••••••" : form.password}
                        readOnly={editingUserId !== null}
                        onChange={(e) => updateField("password", e.target.value)}
                        className="flex-1 h-11 rounded-xl bg-secondary border-0 px-4 text-sm"
                      />
                      {editingUserId !== null && (
                        <button onClick={handleResetPassword} className="rounded-xl bg-secondary px-4 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary/80" type="button">
                          <RefreshCw className="h-3.5 w-3.5" /> Reset
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">Cuenta activa</p>
                    <p className="text-xs text-muted-foreground">Permite iniciar sesión</p>
                  </div>
                  <Switch checked={form.active} onCheckedChange={(value) => updateField("active", value)} />
                </div>
              </section>

              <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-sm font-medium">Rol principal</p>
                    <p className="text-xs text-muted-foreground">El backend maneja un solo rol por usuario.</p>
                  </div>
                  {selectedRoleLabel && (
                    <span className="text-[10px] uppercase tracking-wider rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
                      {selectedRoleLabel}
                    </span>
                  )}
                </div>
                {rolesQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">Cargando roles…</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {roleOptions.map((role) => {
                      const on = form.selectedRoleId === role.id;
                      return (
                        <button
                          key={role.id}
                          onClick={() => updateField("selectedRoleId", role.id)}
                          type="button"
                          className={cn(
                            "rounded-xl border p-3 text-left text-sm font-medium transition",
                            on ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-secondary"
                          )}
                        >
                          {role.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>

              {editingUserId !== null && userDetailQuery.data && (
                <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
                  <p className="text-sm font-medium">Actividad del usuario</p>
                  <p className="text-xs text-muted-foreground mt-1">Último ingreso: {userDetailQuery.data.fecha_ultimo_login ? new Date(userDetailQuery.data.fecha_ultimo_login).toLocaleString("es-CR") : "Sin registro"}</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="sticky bottom-0 border-t border-border/60 bg-background px-6 py-4 gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={closeUserDialog} disabled={savingUser} className="flex-1 sm:flex-none">
              Cancelar
            </Button>
            <Button type="button" onClick={handleSaveUser} disabled={savingUser} className="flex-1 sm:flex-none">
              <Save className="h-4 w-4" /> Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="w-[min(96vw,28rem)]">
          <DialogHeader>
            <DialogTitle className="text-lg">¿Eliminar usuario?</DialogTitle>
            <DialogDescription className="mt-2">
              Esta acción no se puede deshacer. El usuario será eliminado permanentemente del sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:flex-row sm:justify-end">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => {
                setDeleteConfirmOpen(false);
                setUserToDelete(null);
              }} 
              disabled={savingUser}
              className="flex-1 sm:flex-none"
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteUser} 
              disabled={savingUser}
              className="flex-1 sm:flex-none"
            >
              {savingUser ? "Eliminando..." : "Eliminar"}
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
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full h-11 rounded-xl bg-secondary border-0 px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}
