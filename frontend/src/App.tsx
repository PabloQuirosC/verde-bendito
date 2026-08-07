import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SessionProvider } from "@/context/session";
import { AppShell } from "@/components/AppShell";
import { NotificationListener } from "@/components/NotificationListener";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AutoRoleRedirect } from "@/components/AutoRoleRedirect";
import ForceChangePasswordModal from "@/components/ForceChangePasswordModal";
import { LoadingSpinner } from "@/components/LoadingSpinner";

import Login from "./pages/Login";
import MeseroMesas from "./pages/mesero/Mesas";
import MeseroOrdenes from "./pages/mesero/Ordenes";
import MeseroComanda from "./pages/mesero/Comanda";
import Cocina from "./pages/cocina/Tablero";
import CocinaHistorial from "./pages/cocina/Historial";
import CajeroOrdenes from "./pages/cajero/Ordenes";
import CajeroCobrar from "./pages/cajero/Cobrar";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminInventario from "./pages/admin/Inventario";
import AdminProveedores from "./pages/admin/Proveedores";
import AdminClientes from "./pages/admin/Clientes";
import AdminUsuarios from "./pages/admin/Usuarios";
import AdminRoles from "./pages/admin/Roles";
import AdminUsuarioEditar from "./pages/admin/UsuarioEditar";
import AdminBitacora from "./pages/admin/Bitacora";
import AdminAjustes from "./pages/admin/Ajustes";
import AdminMesas from "./pages/admin/Mesas";
import AdminCompras from "./pages/admin/Compras";
import AdminCompraDetalle from "./pages/admin/CompraDetalle";
import Notificaciones from "./pages/Notificaciones";
import Perfil from "./pages/Perfil";
import OrdenDetalle from "./pages/OrdenDetalle";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const isApiRequest = (input: RequestInfo | URL) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return /\/api(\/|\?|$)/.test(rawUrl);
};

const Shell = ({ children }: { children: React.ReactNode }) => <AppShell>{children}</AppShell>;

function GlobalLoadingOverlay() {
  const [pendingRequests, setPendingRequests] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const shouldTrack = isApiRequest(input);
      if (shouldTrack) {
        setPendingRequests((current) => current + 1);
      }

      try {
        return await originalFetch(input, init);
      } finally {
        if (shouldTrack) {
          setPendingRequests((current) => Math.max(0, current - 1));
        }
      }
    }) as typeof window.fetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  if (pendingRequests === 0) return null;

  return <LoadingSpinner fullScreen size="lg" text="Cargando..." />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ForceChangePasswordModal />
      <SessionProvider>
        <GlobalLoadingOverlay />
        <BrowserRouter>
          <NotificationListener />
          <Routes>
            {/* Rutas públicas */}
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Navigate to="/" replace />} />

            {/* Redirección automática al menú del rol */}
            <Route path="/roles" element={<AutoRoleRedirect />} />

            <Route path="/mesero/mesas" element={<ProtectedRoute requiredPermission="acceder_mesas"><Shell><MeseroMesas /></Shell></ProtectedRoute>} />
            <Route path="/mesero/ordenes" element={<ProtectedRoute><Shell><MeseroOrdenes /></Shell></ProtectedRoute>} />
            <Route path="/mesero/comanda/:tableId" element={<ProtectedRoute requiredPermission="acceder_mesas"><Shell><MeseroComanda /></Shell></ProtectedRoute>} />

            <Route path="/cocina" element={<ProtectedRoute><Shell><Cocina /></Shell></ProtectedRoute>} />
            <Route path="/cocina/historial" element={<ProtectedRoute><Shell><CocinaHistorial /></Shell></ProtectedRoute>} />

            <Route path="/cajero" element={<ProtectedRoute><Shell><CajeroOrdenes /></Shell></ProtectedRoute>} />
            <Route path="/cajero/cobrar/:orderId" element={<ProtectedRoute><Shell><CajeroCobrar /></Shell></ProtectedRoute>} />

            <Route path="/caja" element={<ProtectedRoute><Shell><CajeroOrdenes /></Shell></ProtectedRoute>} />
            <Route path="/caja/cobrar/:orderId" element={<ProtectedRoute><Shell><CajeroCobrar /></Shell></ProtectedRoute>} />

            <Route path="/mesas" element={<ProtectedRoute requiredPermission="acceder_mesas"><Shell><MeseroMesas /></Shell></ProtectedRoute>} />
            <Route path="/mesas/gestionar" element={<ProtectedRoute><Shell><AdminMesas /></Shell></ProtectedRoute>} />

            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Shell><AdminDashboard /></Shell></ProtectedRoute>} />
            <Route path="/admin/inventario" element={<ProtectedRoute requiredRole="admin"><Shell><AdminInventario /></Shell></ProtectedRoute>} />
            <Route path="/admin/proveedores" element={<ProtectedRoute requiredRole="admin"><Shell><AdminProveedores /></Shell></ProtectedRoute>} />
            <Route path="/admin/clientes" element={<ProtectedRoute requiredRole="admin"><Shell><AdminClientes /></Shell></ProtectedRoute>} />
            <Route path="/admin/compras" element={<ProtectedRoute requiredRole="admin"><Shell><AdminCompras /></Shell></ProtectedRoute>} />
            <Route path="/admin/compras/:id" element={<ProtectedRoute requiredRole="admin"><Shell><AdminCompraDetalle /></Shell></ProtectedRoute>} />
            <Route path="/admin/usuarios" element={<ProtectedRoute requiredRole="admin"><Shell><AdminUsuarios /></Shell></ProtectedRoute>} />
            <Route path="/admin/usuarios/roles" element={<ProtectedRoute requiredRole="admin"><Shell><AdminRoles /></Shell></ProtectedRoute>} />
            <Route path="/admin/usuarios/nuevo" element={<ProtectedRoute requiredRole="admin"><Shell><AdminUsuarioEditar /></Shell></ProtectedRoute>} />
            <Route path="/admin/usuarios/:id" element={<ProtectedRoute requiredRole="admin"><Shell><AdminUsuarioEditar /></Shell></ProtectedRoute>} />
            <Route path="/admin/bitacora" element={<ProtectedRoute requiredRole="admin"><Shell><AdminBitacora /></Shell></ProtectedRoute>} />
            <Route path="/admin/ajustes" element={<ProtectedRoute requiredRole="admin"><Shell><AdminAjustes /></Shell></ProtectedRoute>} />
            <Route path="/admin/mesas" element={<ProtectedRoute requiredRole="admin"><Shell><AdminMesas /></Shell></ProtectedRoute>} />

            <Route path="/notificaciones" element={<ProtectedRoute><Shell><Notificaciones /></Shell></ProtectedRoute>} />
            <Route path="/perfil" element={<ProtectedRoute><Shell><Perfil /></Shell></ProtectedRoute>} />
            <Route path="/orden/:id" element={<ProtectedRoute><Shell><OrdenDetalle /></Shell></ProtectedRoute>} />

            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
