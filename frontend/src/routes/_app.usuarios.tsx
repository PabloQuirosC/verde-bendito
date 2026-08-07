import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2, Shield, Key, Lock } from "lucide-react";
import { toast } from "sonner";
import { useStore, MODULE_LABELS } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import type { ModuleId, RoleDef, User } from "@/store/types";
import { ALL_MODULES } from "@/store/types";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";

export const Route = createFileRoute("/_app/usuarios")({
  component: UsuariosPage,
});

const emptyUser = (role: string): User => ({
  id: Math.random().toString(36).slice(2, 8),
  name: "",
  email: "",
  username: "",
  password: "Soporte", // Default password for new users
  role,
  active: true,
});

function UsuariosPage() {
  const users = useStore((s) => s.users);
  const roles = useStore((s) => s.roles);
  const upsert = useStore((s) => s.upsertUser);
  const remove = useStore((s) => s.removeUser);
  const upsertRole = useStore((s) => s.upsertRole);
  const removeRole = useStore((s) => s.removeRole);
  const loadUsers = useStore((s) => s.loadUsers);
  const loadRoles = useStore((s) => s.loadRoles);
  const [editing, setEditing] = useState<User | null>(null);
  const [editingRole, setEditingRole] = useState<RoleDef | null>(null);
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [deleteRoleConfirmId, setDeleteRoleConfirmId] = useState<string | null>(null);
  const [deleteUserConfirmId, setDeleteUserConfirmId] = useState<string | null>(null);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [roleDialog, setRoleDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });
  const [userDialog, setUserDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
  }>({
    open: false,
    title: "",
    description: "",
  });

  // Cargar usuarios y roles del backend cuando el componente se monta
  useEffect(() => {
    loadUsers();
    loadRoles();
  }, []);

  const pag = usePagination(users, 4);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSaveUser = async () => {
    if (!editing) return;
    if (!editing.name.trim() || !editing.username.trim() || !editing.email?.trim()) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editing.email)) {
      toast.error("Por favor ingresa un correo válido");
      return;
    }
    
    setIsLoadingUser(true);
    try {
      await upsert(editing);
      setEditing(null);
      toast.success("Usuario guardado exitosamente");
      // Recargar usuarios del backend
      await loadUsers();
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      toast.error("Error al guardar el usuario");
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    const numericUserId = Number(userId);
    if (!Number.isFinite(numericUserId)) {
      toast.error("Este usuario todavía no está sincronizado con la base de datos.");
      return;
    }
    
    setIsResettingPassword(true);
    try {
      await apiClient.resetearContraseña(numericUserId);
      // Marcar estado local para reflejar que debe cambiar la contraseña
      await upsert({ ...user, debe_cambiar_contraseña: true });
      setResetConfirm(null);
      toast.success("Contraseña reseteada. Usuario deberá cambiarla al ingresar.");
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al resetear la contraseña');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    const id = (editingRole.id || editingRole.label.toLowerCase().trim().replace(/\s+/g, "-")).trim();
    if (!id || !editingRole.label.trim() || editingRole.modules.length === 0) {
      toast.error("Por favor completa todos los campos y selecciona módulos");
      return;
    }
    
    setIsLoadingRole(true);
    try {
      await upsertRole({ ...editingRole, id });
      setEditingRole(null);
      toast.success("Rol guardado exitosamente");
      // Recargar roles del backend
      await loadRoles();
    } catch (error) {
      console.error("Error al guardar rol:", error);
      toast.error("Error al guardar el rol");
    } finally {
      setIsLoadingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    setDeleteRoleConfirmId(roleId);
  };

  const confirmDeleteRole = async () => {
    if (!deleteRoleConfirmId) return;

    const roleLabel = roles.find((r) => r.id === deleteRoleConfirmId)?.label || "";
    setIsDeletingRole(true);
    try {
      await removeRole(deleteRoleConfirmId);
      await loadRoles();
      setRoleDialog({
        open: true,
        title: "Rol eliminado",
        description: roleLabel
          ? `El rol ${roleLabel} se eliminó correctamente.`
          : "El rol se eliminó correctamente.",
      });
    } catch (error) {
      console.error("Error al eliminar rol:", error);
      const message = error instanceof Error ? error.message : "Error al eliminar el rol";
      setRoleDialog({
        open: true,
        title: "No se pudo eliminar el rol",
        description: message,
      });
    } finally {
      setIsDeletingRole(false);
      setDeleteRoleConfirmId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setDeleteUserConfirmId(userId);
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserConfirmId) return;

    const userName = users.find((u) => u.id === deleteUserConfirmId)?.name || "";
    setIsDeletingUser(true);
    try {
      await remove(deleteUserConfirmId);
      await loadUsers();
      setUserDialog({
        open: true,
        title: "Usuario eliminado",
        description: userName
          ? `El usuario ${userName} se eliminó correctamente.`
          : "El usuario se eliminó correctamente.",
      });
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      const message = error instanceof Error ? error.message : "Error al eliminar el usuario";
      setUserDialog({
        open: true,
        title: "No se pudo eliminar el usuario",
        description: message,
      });
    } finally {
      setIsDeletingUser(false);
      setDeleteUserConfirmId(null);
    }
  };

  const toggleModule = (m: ModuleId) => {
    if (!editingRole) return;
    const has = editingRole.modules.includes(m);
    setEditingRole({
      ...editingRole,
      modules: has ? editingRole.modules.filter((x) => x !== m) : [...editingRole.modules, m],
    });
  };

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Usuarios y roles</h1>
          <p className="text-sm text-muted-foreground">{users.length} cuentas · {roles.length} roles</p>
        </div>
        <Button onClick={() => setEditing(emptyUser(roles[0]?.id ?? "mesero"))}>
          <Plus className="h-4 w-4 mr-1.5" /> Nuevo usuario
        </Button>
      </div>

      {/* Tabla usuarios */}
      <div className="pos-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3 text-left">Nombre</th>
                <th className="p-3 text-left">Correo</th>
                <th className="p-3 text-left">Usuario</th>
                <th className="p-3 text-left">Rol</th>
                <th className="p-3 text-center">Activo</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {pag.pageItems.map((u) => {
                const role = roles.find((r) => r.id === u.role);
                return (
                  <tr key={u.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">{u.name}</td>
                    <td className="p-3 text-muted-foreground text-xs">{u.email || "-"}</td>
                    <td className="p-3 text-muted-foreground">@{u.username}</td>
                    <td className="p-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                        {role?.label ?? u.role}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Switch
                        checked={u.active}
                        onCheckedChange={(v) => upsert({ ...u, active: v })}
                      />
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          title="Resetear contraseña"
                          onClick={() => setResetConfirm(u.id)}
                        >
                          <Lock className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditing(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteUser(u.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pag.page}
          totalPages={pag.totalPages}
          rangeStart={pag.rangeStart}
          rangeEnd={pag.rangeEnd}
          total={pag.total}
          onPage={pag.setPage}
        />
      </div>

      {/* Roles */}
      <div className="pos-card p-4 md:p-5">
        <div className="flex items-end justify-between mb-3 gap-2 flex-wrap">
          <div>
            <h3 className="font-display text-lg flex items-center gap-2">
              <Shield className="h-4 w-4" /> Roles y permisos
            </h3>
            <p className="text-xs text-muted-foreground">
              Define qué páginas puede ver cada rol.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setEditingRole({ id: "", label: "", modules: [], system: false })}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Nuevo rol
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {roles.map((r) => {
            const userCount = users.filter((u) => u.role === r.id).length;
            return (
              <div key={r.id} className="border rounded-lg p-3 group">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {r.label}
                      {r.system && (
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          sistema
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {userCount} usuario{userCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingRole(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {!r.system && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive disabled:opacity-30"
                        disabled={userCount > 0}
                        onClick={() => handleDeleteRole(r.id)}
                        title={userCount > 0 ? "Reasigna los usuarios primero" : "Eliminar"}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {r.modules.map((m) => (
                    <span key={m} className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {MODULE_LABELS[m] ?? m}
                    </span>
                  ))}
                  {r.modules.length === 0 && (
                    <span className="text-xs text-destructive">Sin permisos</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diálogo usuario */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing && users.some((u) => u.id === editing.id) ? "Editar" : "Nuevo"} usuario</DialogTitle>
            <DialogDescription>Datos de acceso y módulos permitidos.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Field label="Nombre completo">
                <Input value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Correo electrónico">
                <Input
                  type="email"
                  value={editing.email || ""}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                  placeholder="usuario@example.com"
                />
              </Field>
              <Field label="Usuario">
                <Input
                  value={editing.username}
                  onChange={(e) => setEditing({ ...editing, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
                  placeholder="ana"
                />
              </Field>
              <Field label="Rol">
                <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={isLoadingUser}>Cancelar</Button>
            <Button onClick={handleSaveUser} disabled={isLoadingUser}>
              {isLoadingUser ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo confirmación reset contraseña */}
      <Dialog open={!!resetConfirm} onOpenChange={(o) => !o && setResetConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" /> Resetear contraseña
            </DialogTitle>
            <DialogDescription>
              La contraseña será establecida en "Soporte" y el usuario deberá cambiarla al ingresar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              <strong>Usuario:</strong> {users.find(u => u.id === resetConfirm)?.name}
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded p-3">
              <p className="text-sm text-blue-900">
                ⚠️ Contraseña temporal: <strong>Soporte</strong>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirm(null)} disabled={isResettingPassword}>Cancelar</Button>
            <Button 
              onClick={() => resetConfirm && handleResetPassword(resetConfirm)}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isResettingPassword}
            >
              <Key className="h-3.5 w-3.5 mr-1.5" /> {isResettingPassword ? "Reseteando..." : "Resetear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo confirmación eliminar rol */}
      <Dialog open={!!deleteRoleConfirmId} onOpenChange={(o) => !o && setDeleteRoleConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar rol</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este rol?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteRoleConfirmId(null)}
              disabled={isDeletingRole}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteRole}
              disabled={isDeletingRole}
            >
              {isDeletingRole ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo resultado eliminar rol */}
      <Dialog
        open={roleDialog.open}
        onOpenChange={(o) => !o && setRoleDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{roleDialog.title}</DialogTitle>
            <DialogDescription>{roleDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setRoleDialog((prev) => ({ ...prev, open: false }))}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo confirmación eliminar usuario */}
      <Dialog open={!!deleteUserConfirmId} onOpenChange={(o) => !o && setDeleteUserConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este usuario?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteUserConfirmId(null)}
              disabled={isDeletingUser}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={isDeletingUser}
            >
              {isDeletingUser ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo resultado eliminar usuario */}
      <Dialog
        open={userDialog.open}
        onOpenChange={(o) => !o && setUserDialog((prev) => ({ ...prev, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{userDialog.title}</DialogTitle>
            <DialogDescription>{userDialog.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setUserDialog((prev) => ({ ...prev, open: false }))}>
              Aceptar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo rol */}
      <Dialog open={!!editingRole} onOpenChange={(o) => !o && setEditingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRole && roles.some((r) => r.id === editingRole.id) ? "Editar" : "Nuevo"} rol
            </DialogTitle>
            <DialogDescription>
              Selecciona las páginas que este rol podrá ver.
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-4">
              <Field label="Nombre del rol">
                <Input
                  value={editingRole.label}
                  onChange={(e) => setEditingRole({ ...editingRole, label: e.target.value })}
                  placeholder="Ej. Supervisor, Bartender…"
                  disabled={editingRole.system}
                />
                {editingRole.system && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Roles del sistema no pueden cambiar de nombre, pero sí de permisos.
                  </p>
                )}
              </Field>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">
                  Módulos permitidos ({editingRole.modules.length}/{ALL_MODULES.length})
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map((m) => {
                    const checked = editingRole.modules.includes(m);
                    return (
                      <label
                        key={m}
                        className={cn(
                          "flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition",
                          checked ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleModule(m)}
                        />
                        <span className="text-sm font-medium">{MODULE_LABELS[m]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRole(null)} disabled={isLoadingRole}>Cancelar</Button>
            <Button onClick={handleSaveRole} disabled={isLoadingRole}>
              {isLoadingRole ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
