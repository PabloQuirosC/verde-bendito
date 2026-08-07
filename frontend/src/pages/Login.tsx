import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useSession } from "@/context/session";
import { useStore } from "@/store/useStore";
import { systemUsers } from "@/data/mock";
import { loginUser } from "@/lib/api";
import { getRouteByRole } from "@/lib/role-routes";
import { decodeJwtPayload, normalizeRolesFromToken } from "@/lib/jwt";

export default function Login() {
  const [show, setShow] = useState(false);
  const [user, setUser] = useState("sistema");
  const [pwd, setPwd] = useState("****");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(true);
  const { setUser: setSessionUser, setAvailableRoles, setAuthUser } = useSession();
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Verde Bendito · Inicio de sesión";
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const resp: any = await loginUser(user.trim().toLowerCase(), pwd);
      if (resp && resp.success && resp.token) {
        const payload = decodeJwtPayload(resp.token);
        if (!payload) {
          throw new Error("Token inválido");
        }

        const authData = {
          user_id: Number(payload.user_id) || 0,
          username: payload.username || payload.sub || user,
          email: payload.email || "",
          roles: normalizeRolesFromToken(payload.roles).length ? normalizeRolesFromToken(payload.roles) : ["mesero"],
          permisos: Array.isArray(payload.permisos) ? payload.permisos : [],
          token: resp.token,
        };
        
        setSessionUser(authData.username);
        setAvailableRoles(authData.roles as any);
        setAuthUser(authData);
        // Sincronizar con Zustand: agregar usuario y abrir modal si es necesario
        try {
          const parsedUserId = Number(payload.user_id);
          const normalizedUserId = Number.isFinite(parsedUserId) && parsedUserId > 0 ? String(parsedUserId) : null;
          const userId = normalizedUserId || authData.username;
          const mustChange = pwd === "Soporte";
          useStore.setState((s: any) => ({
            users: s.users.some((u: any) => u.id === userId)
              ? s.users
              : [...s.users, { id: userId, name: authData.username, username: authData.username, password: pwd, role: (authData.roles[0] as any) || 'mesero', active: true, debe_cambiar_contraseña: mustChange }],
            currentUserId: normalizedUserId || userId,
            currentUserName: authData.username,
            currentUserRole: (authData.roles[0] as any) || 'mesero',
            token: authData.token,
            forceChangePasswordModalOpen: mustChange,
          }));
        } catch (err) {
          console.warn("Login: failed to sync to store", err);
        }
        setLoading(false);
        
        // Redireccionar automáticamente al menú del rol
        const route = getRouteByRole(authData.roles);
        nav(route);
        return;
      }
      throw new Error(resp?.message || "Respuesta inválida del servidor");
    } catch (err: any) {
      const isAuthError = err?.status === 401 || err?.status === 403;
      const isNetworkError = !err?.status || err?.status >= 500;
      
      let errorMsg = "Error al iniciar sesión";
      if (err instanceof Error) {
        errorMsg = err.message;
      }

      console.error("Login error:", { errorMsg, status: err?.status, isAuthError, isNetworkError });

      // SOLO permitir fallback al mock en caso de ERROR DE RED (no autenticación)
      if (isNetworkError && import.meta.env.DEV) {
        console.warn("⚠️ MODO OFFLINE (desarrollo): usando fallback al mock");
        const found = systemUsers.find((u) => u.username === user.trim().toLowerCase());
        if (found) {
          const authData = {
            user_id: 0,
            username: found.name,
            email: "",
            roles: found.roles,
            permisos: [],
            token: "dev_mock_token_" + Date.now(),
          };
          
          setSessionUser(found.name);
          setAvailableRoles(found.roles);
          setAuthUser(authData);
          setError("ℹ️ Usando mock (backend no disponible)");
          setLoading(false);
          
          // Redireccionar automáticamente al menú del rol
          const route = getRouteByRole(found.roles);
          nav(route);
          return;
        }
      }

      // Error de autenticación o usuario no encontrado
      if (isAuthError) {
        setError("❌ Usuario o contraseña inválidos");
      } else if (isNetworkError && !import.meta.env.DEV) {
        setError("⚠️ Error de conexión con servidor. Intenta más tarde.");
      } else {
        setError(errorMsg || "Error desconocido al iniciar sesión");
      }
      
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-stone-50 via-orange-50 to-stone-100 text-foreground flex flex-col relative overflow-hidden">
      {/* Elementos decorativos de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-gradient-to-br from-orange-200/20 to-transparent rounded-full blur-3xl animate-pulse opacity-40" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-tl from-green-200/20 to-transparent rounded-full blur-3xl animate-pulse opacity-40" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <section className="flex items-center justify-center px-2 py-4 sm:px-8 lg:justify-start lg:px-4">
            <div className="w-full max-w-xl text-center lg:text-left">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/45 bg-white/30 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-black/80 animate-fade-in" style={{ animationDuration: '0.7s', animationFillMode: 'both' }}>
                <span className="h-2 w-2 rounded-full bg-green-600" />
                VERDE BENDITO
              </div>

              <div className="mt-6 flex justify-center lg:justify-start animate-fade-in" style={{ animationDuration: '0.8s', animationDelay: '0.08s', animationFillMode: 'both' }}>
                <img
                  src="/logo.png"
                  alt="Verde Bendito Logo"
                  className="h-28 w-auto max-w-full object-contain drop-shadow-[0_12px_24px_rgba(31,77,51,0.14)] sm:h-36 lg:h-[13rem]"
                />
              </div>

              <div className="mt-5 animate-fade-in sm:mt-6" style={{ animationDuration: '0.8s', animationDelay: '0.16s', animationFillMode: 'both' }}>
                <h1 className="font-display text-3xl font-semibold leading-tight text-black sm:text-4xl lg:text-5xl">
                  Gestión clara, rápida y profesional.
                </h1>
                <p className="mt-3 max-w-lg text-sm leading-6 text-black/70 sm:mt-4 sm:text-base lg:text-[1.05rem]">
                  Accede al sistema para coordinar meseros, cocina, caja y administración con una experiencia limpia y elegante.
                </p>
              </div>
            </div>
          </section>

          <section className="flex items-center justify-center px-2 py-4 sm:px-8 lg:justify-end lg:px-4">
            <div className="w-full max-w-lg animate-fade-in" style={{ animationDuration: '0.85s', animationDelay: '0.18s', animationFillMode: 'both' }}>
              <div className="bg-transparent p-0">
                <div className="mb-6 sm:mb-8">
                  <h2 className="font-display text-2xl font-semibold leading-tight text-black sm:text-3xl">Bienvenido</h2>
                  <p className="mt-2 text-sm font-medium text-black/70">Inicia sesión para continuar</p>
                </div>

                <form onSubmit={submit} className="space-y-4 sm:space-y-5">
                  <div className="space-y-2.5 group">
                    <Label htmlFor="user" className="text-black text-xs font-semibold uppercase tracking-widest">Usuario</Label>
                    <Input
                      id="user"
                      value={user}
                      onChange={(e) => setUser(e.target.value)}
                      className="h-12 rounded-2xl border-0 bg-white/65 text-black placeholder:text-black/45 shadow-none ring-0 transition-all duration-300 focus-visible:bg-white focus-visible:ring-0 focus-visible:outline-none"
                      placeholder="tu usuario"
                    />
                  </div>

                  <div className="space-y-2.5 group">
                    <Label htmlFor="pwd" className="text-black text-xs font-semibold uppercase tracking-widest">Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="pwd"
                        type={show ? "text" : "password"}
                        value={pwd}
                        onChange={(e) => setPwd(e.target.value)}
                        className="h-12 rounded-2xl border-0 bg-white/65 text-black placeholder:text-black/45 pr-12 shadow-none ring-0 transition-all duration-300 focus-visible:bg-white focus-visible:ring-0 focus-visible:outline-none"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-black/50 transition-colors hover:text-black"
                        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <Checkbox
                        checked={remember}
                        onCheckedChange={(checked) => setRemember(checked === true)}
                        className="border-green-200 text-green-700 hover:border-green-300"
                      />
                      <span className="text-xs font-medium text-black/75">Recuérdame</span>
                    </label>
                    <button type="button" className="text-xs font-medium text-black/75 transition-colors hover:text-black hover:underline hover:underline-offset-2">
                      ¿Olvidó contraseña?
                    </button>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
                      <p className="text-sm font-medium text-red-700">{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !user || !pwd}
                    className="relative h-14 w-full overflow-hidden rounded-2xl border-0 bg-gradient-to-r from-green-700 to-green-800 text-lg font-semibold text-white shadow-[0_16px_30px_rgba(22,101,52,0.22)] transition-all duration-300 hover:-translate-y-0.5 hover:from-green-800 hover:to-green-900 hover:shadow-[0_20px_40px_rgba(22,101,52,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
                    size="lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/35 to-white/0 -translate-x-full opacity-0 transition-transform duration-700 group-hover:translate-x-full group-hover:opacity-100" />
                    {loading ? (
                      <span className="inline-flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Iniciando sesión…
                      </span>
                    ) : (
                      "Iniciar sesión"
                    )}
                  </Button>
                </form>

                <p className="mt-6 text-center text-xs font-medium text-black/55">
                  © 2026 Verde Bendito. Todos los derechos reservados.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in forwards;
        }
      `}</style>
    </main>
  );
}
