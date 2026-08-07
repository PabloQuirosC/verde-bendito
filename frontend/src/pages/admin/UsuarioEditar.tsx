import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, RefreshCw, Save, ScrollText, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { AdminUsersSubnav } from "@/components/AdminUsersSubnav";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/utils";

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

const roleTitles: Record<string, string> = {
  mesero: "Mesero",
  cocina: "Cocina",
  cajero: "Cajero",
  admin: "Administrador",
  administrador: "Administrador",
};

export default function AdminUsuarioEditar() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id && id !== "nuevo");

  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [country, setCountry] = useState("CR");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const usuarioId = editing ? Number(id) : null;

  const userQuery = useQuery({
    queryKey: ["usuario", usuarioId],
    enabled: editing && Number.isFinite(usuarioId ?? NaN),
    queryFn: async () => apiClient.obtenerUsuario(usuarioId as number) as Promise<BackendUser>,
  });

  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () => apiClient.listarRoles(0, 100) as Promise<BackendRole[]>,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!userQuery.data) return;
    setName(userQuery.data.nombre ?? "");
    setSurname(userQuery.data.apellido ?? "");
    setEmail(userQuery.data.email ?? "");
    setUsername(userQuery.data.nombre_usuario ?? "");
    setCountry(userQuery.data.pais ?? "CR");
    setActive(Number(userQuery.data.activo) === 1);
  }, [userQuery.data]);

  useEffect(() => {
    if (!rolesQuery.data || selectedRoleId) return;
    const currentRoleId = userQuery.data?.rol?.id;
    if (currentRoleId) {
      setSelectedRoleId(String(currentRoleId));
      return;
    }
    if (!editing && rolesQuery.data.length > 0) {
      setSelectedRoleId(String(rolesQuery.data[0].id));
    }
  }, [editing, rolesQuery.data, selectedRoleId, userQuery.data?.rol?.id]);

  const roleOptions = useMemo(
    () => (rolesQuery.data ?? []).map((role) => ({
      id: String(role.id),
      label: roleTitles[String(role.nombre_rol ?? role.nombre ?? "").toLowerCase()] ?? role.nombre_rol ?? role.nombre ?? `Rol ${role.id}`,
    })),
    [rolesQuery.data]
  );

  const selectedRole = roleOptions.find((role) => role.id === selectedRoleId);

  const handleSave = async () => {
    if (!name.trim() || !surname.trim() || !email.trim() || !username.trim() || !country.trim()) {
      toast.error("Completa los campos obligatorios");
      return;
    }
    if (!editing && !password.trim()) {
      toast.error("La contraseña es obligatoria para un usuario nuevo");
      return;
    }
    if (!selectedRoleId) {
      toast.error("Selecciona un rol");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nombre: name.trim(),
        apellido: surname.trim(),
        email: email.trim(),
        nombre_usuario: username.trim(),
        pais: country.trim(),
        activo: active ? 1 : 0,
      };

      if (password.trim()) {
        payload.contrasena = password.trim();
      }

      if (editing && usuarioId !== null) {
        await apiClient.actualizarUsuario(usuarioId, payload);
        await apiClient.asignarRolAUsuario(usuarioId, Number(selectedRoleId));
        toast.success("Usuario actualizado");
      } else {
        const created = await apiClient.crearUsuario({ ...payload, contrasena: password.trim() });
        const createdId = Number((created as { id?: number }).id);
        if (Number.isFinite(createdId)) {
          await apiClient.asignarRolAUsuario(createdId, Number(selectedRoleId));
        }
        toast.success("Usuario creado");
      }

      navigate("/admin/usuarios");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo guardar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editing || usuarioId === null) return;
    if (!window.confirm("¿Eliminar este usuario?")) return;

    setSaving(true);
    try {
      await apiClient.eliminarUsuario(usuarioId);
      toast.success("Usuario eliminado");
      navigate("/admin/usuarios");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo eliminar el usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!editing || usuarioId === null) return;
    try {
      const response = await apiClient.resetearContraseña(usuarioId);
      toast.success(response?.message || "Contraseña reseteada");
    } catch (err: any) {
      toast.error(err?.message || "No se pudo resetear la contraseña");
    }
  };

  const title = editing ? "Editar usuario" : "Nuevo usuario";
  const subtitle = editing
    ? userQuery.data
      ? `${userQuery.data.email} · ${userQuery.data.nombre_usuario}`
      : "Cargando usuario..."
    : "Cuenta de personal";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        back="/admin/usuarios"
      />

      <AdminUsersSubnav />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        {(userQuery.isLoading || rolesQuery.isLoading) && editing ? (
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-6 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Cargando datos del usuario…</p>
          </div>
        ) : null}

        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nombre" value={name} onChange={setName} />
            <Field label="Apellido" value={surname} onChange={setSurname} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Correo" value={email} onChange={setEmail} type="email" />
            <Field label="Usuario" value={username} onChange={setUsername} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="País" value={country} onChange={setCountry} />
            {!editing && <Field label="Contraseña" value={password} onChange={setPassword} type="password" />}
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Contraseña</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="password"
                value={editing ? "••••••••" : password}
                readOnly={editing}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 h-11 rounded-xl bg-secondary border-0 px-4 text-sm"
              />
              {editing && (
                <button onClick={handleResetPassword} className="rounded-xl bg-secondary px-4 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-secondary/80">
                  <RefreshCw className="h-3.5 w-3.5" /> Reset
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Cuenta activa</p>
              <p className="text-xs text-muted-foreground">Permite iniciar sesión</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </div>
        </section>

        <section className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-medium">Rol principal</p>
              <p className="text-xs text-muted-foreground">El backend maneja un solo rol por usuario.</p>
            </div>
            {selectedRole && (
              <span className="text-[10px] uppercase tracking-wider rounded-full bg-secondary px-2 py-1 text-secondary-foreground">
                {selectedRole.label}
              </span>
            )}
          </div>
          {rolesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando roles…</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roleOptions.map((role) => {
                const on = selectedRoleId === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
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

        {editing && userQuery.data && (
          <div className="rounded-2xl bg-card border border-border/60 shadow-soft p-4">
            <p className="text-sm font-medium">Actividad del usuario</p>
            <p className="text-xs text-muted-foreground mt-1">Último ingreso: {userQuery.data.fecha_ultimo_login ? new Date(userQuery.data.fecha_ultimo_login).toLocaleString("es-CR") : "Sin registro"}</p>
          </div>
        )}

        {editing && userQuery.data && (
          <Link to="/admin/bitacora" className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-4 hover:bg-secondary transition">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-card">
              <ScrollText className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Ver bitácora del usuario</p>
              <p className="text-xs text-muted-foreground">Eventos filtrados por {userQuery.data.nombre} {userQuery.data.apellido}</p>
            </div>
          </Link>
        )}

        <div className="flex gap-2">
          {editing && (
            <button onClick={handleDelete} disabled={saving} className="flex-1 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive py-3 text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-destructive/10 disabled:opacity-60">
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          )}
          <Button onClick={handleSave} disabled={saving} className="flex-1 h-12 rounded-xl">
            <Save className="h-4 w-4 mr-2" /> Guardar cambios
          </Button>
        </div>
      </div>
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
