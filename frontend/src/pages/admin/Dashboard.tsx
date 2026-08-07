import { ShoppingCart, Table2, ChefHat, BarChart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { formatCRC } from "@/data/mock";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { VentasMensualesChart } from "@/components/charts/VentasMensualesChart";
import { VentasProductoChart } from "@/components/charts/VentasProductoChart";
import { MediosPagoChart } from "@/components/charts/MediosPagoChart";
import { VentasDiariasChart } from "@/components/charts/VentasDiariasChart";
import { apiClient } from "@/lib/api";

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => apiClient.getDashboardStats(),
  });

  const { data: ventasMensuales, isLoading: ventasMensualesLoading } = useQuery({
    queryKey: ["dashboard", "ventas-mensuales"],
    queryFn: () => apiClient.getVentasMensuales(),
  });

  const { data: ventasProductos, isLoading: ventasProductosLoading } = useQuery({
    queryKey: ["dashboard", "ventas-productos"],
    queryFn: () => apiClient.getVentasProductos(),
  });

  const { data: mediosPago, isLoading: mediosPagoLoading } = useQuery({
    queryKey: ["dashboard", "medios-pago"],
    queryFn: () => apiClient.getMediosPago(),
  });

  const { data: ventasDiarias, isLoading: ventasDiariasLoading } = useQuery({
    queryKey: ["dashboard", "ventas-diarias"],
    queryFn: () => apiClient.getVentasDiarias(),
  });

  const { data: mesasOcupadas, isLoading: mesasOcupadasLoading } = useQuery({
    queryKey: ["dashboard", "mesas-ocupadas"],
    queryFn: () => apiClient.mesasOcupadas(),
  });

  const { data: cocinaOrdenes, isLoading: cocinaOrdenesLoading } = useQuery({
    queryKey: ["dashboard", "cocina-ordenes"],
    queryFn: async () => {
      const base = `${window.location.protocol}//${window.location.hostname}:8000/api`;
      const response = await fetch(`${base}/comandas/cocina/ordenes`, {
        headers: (() => {
          const token = sessionStorage.getItem("auth_token");
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })(),
      });

      if (!response.ok) return null;
      return response.json();
    },
  });

  const mesasOcupadasCount = Array.isArray(mesasOcupadas)
    ? mesasOcupadas.length
    : Array.isArray((mesasOcupadas as any)?.data)
      ? (mesasOcupadas as any).data.length
      : 0;

  const cocinaCounts = cocinaOrdenes?.data ?? cocinaOrdenes ?? {};
  const cocinaActivas = ["pendiente", "proceso", "listo"].reduce((total, key) => {
    const items = cocinaCounts?.[key];
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);

  return (
    <>
      <PageHeader title="Dashboard" home />

      <div className="px-4 lg:px-6 pb-8 space-y-4">
        {/* KPIs */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Ventas Totales"
            value={formatCRC(stats?.ventas_totales || 0)}
            icon={ShoppingCart}
            loading={statsLoading}
          />
          <KpiCard
            title="Mesas Ocupadas"
            value={`${mesasOcupadasCount}`}
            icon={Table2}
            loading={mesasOcupadasLoading}
          />
          <KpiCard
            title="Comandas en cocina"
            value={`${cocinaActivas}`}
            icon={ChefHat}
            loading={cocinaOrdenesLoading}
          />
          <KpiCard
            title="Tendencia"
            value="+5%"
            icon={BarChart}
            loading={statsLoading}
          />
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard title="Ventas Mensuales" loading={ventasMensualesLoading}>
            <VentasMensualesChart data={ventasMensuales || []} />
          </ChartCard>
          <ChartCard title="Ventas por Producto" loading={ventasProductosLoading}>
            <VentasProductoChart data={ventasProductos || []} />
          </ChartCard>
          <ChartCard title="Medios de pago" loading={mediosPagoLoading}>
            <MediosPagoChart data={mediosPago || []} />
          </ChartCard>
          <ChartCard title="Ventas Diarias" loading={ventasDiariasLoading}>
            <VentasDiariasChart data={ventasDiarias || []} />
          </ChartCard>
        </section>
      </div>
    </>
  );
}

function KpiCard({ title, value, icon: Icon, loading }: { title: string; value: string; icon: React.ElementType; loading?: boolean }) {
  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-3">
              <LoadingSpinner size="sm" variant="dots" />
            </div>
          ) : (
            <p className="text-2xl font-bold mt-2">{value}</p>
          )}
        </div>
        <div className="bg-gray-200 p-2 rounded-lg shrink-0">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, loading }: { title: string; children: React.ReactNode; loading?: boolean }) {
  return (
    <div className="bg-card p-4 rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      {loading ? (
        <div className="h-80 flex items-center justify-center">
          <LoadingSpinner size="md" variant="spin" text="Cargando datos..." />
        </div>
      ) : (
        children
      )}
    </div>
  );
}
