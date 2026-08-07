import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { DollarSign, ShoppingBag, TrendingUp, Trophy } from "lucide-react";
import { useStore } from "@/store/useStore";
import { formatCRC } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const orders = useStore((s) => s.orders);
  const users = useStore((s) => s.users);

  const paid = orders.filter((o) => o.status === "cobrado");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const year = new Date(today.getFullYear(), 0, 1);

  const sumIn = (since: Date) =>
    paid.filter((o) => new Date(o.updatedAt) >= since).reduce((s, o) => s + o.total, 0);

  const totals = {
    today: sumIn(today),
    month: sumIn(month),
    year: sumIn(year),
    all: paid.reduce((s, o) => s + o.total, 0),
  };

  const byHour = useMemo(() => {
    const arr = Array.from({ length: 12 }, (_, i) => ({
      h: `${10 + i}h`,
      ventas: 0,
    }));
    paid.forEach((o) => {
      const h = new Date(o.updatedAt).getHours();
      const idx = h - 10;
      if (idx >= 0 && idx < arr.length) arr[idx].ventas += o.total;
    });
    return arr;
  }, [paid]);

  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; total: number }>();
    paid.forEach((o) => {
      o.items.forEach((it) => {
        const e = map.get(it.productId) ?? { name: it.name, qty: 0, total: 0 };
        e.qty += it.qty;
        e.total += it.qty * it.price;
        map.set(it.productId, e);
      });
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [paid]);

  const topWaiters = useMemo(() => {
    const map = new Map<string, { name: string; total: number; orders: number }>();
    paid.forEach((o) => {
      const e = map.get(o.waiterId) ?? { name: o.waiterName, total: 0, orders: 0 };
      e.total += o.total;
      e.orders += 1;
      map.set(o.waiterId, e);
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [paid]);

  const COLORS = ["#c66a2d", "#7a8a3a", "#d4a14a", "#3a6f8a", "#8a3a3a"];

  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {users.length} usuarios · {orders.length} órdenes registradas · {paid.length} cobradas
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        <Kpi label="Hoy" value={totals.today} icon={DollarSign} />
        <Kpi label="Este mes" value={totals.month} icon={TrendingUp} />
        <Kpi label="Este año" value={totals.year} icon={ShoppingBag} />
        <Kpi label="Histórico" value={totals.all} icon={Trophy} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="pos-card p-3 sm:p-5 lg:col-span-2 flex flex-col">
          <h3 className="font-display text-base sm:text-lg mb-3">Ventas por hora</h3>
          <div className="h-48 sm:h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={byHour}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="h" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  formatter={(v) => formatCRC(Number(v))}
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                />
                <Bar dataKey="ventas" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pos-card p-3 sm:p-5 flex flex-col">
          <h3 className="font-display text-base sm:text-lg mb-3">Top productos</h3>
          {topProducts.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-48 sm:h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie data={topProducts} dataKey="qty" nameKey="name" outerRadius={80} label={(p) => p.name}>
                    {topProducts.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
        <div className="pos-card p-3 sm:p-5">
          <h3 className="font-display text-base sm:text-lg mb-3">Productos más vendidos</h3>
          {topProducts.length === 0 ? <Empty /> : (
            <ul className="divide-y text-sm">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex items-center gap-2 sm:gap-3 py-2">
                  <span className="font-display text-lg sm:text-2xl text-primary w-5 sm:w-6">{i + 1}</span>
                  <span className="flex-1 truncate text-xs sm:text-sm">{p.name}</span>
                  <span className="text-muted-foreground text-xs">{p.qty} u</span>
                  <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">{formatCRC(p.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="pos-card p-3 sm:p-5">
          <h3 className="font-display text-base sm:text-lg mb-3">Mejores vendedores</h3>
          {topWaiters.length === 0 ? <Empty /> : (
            <ul className="divide-y text-sm">
              {topWaiters.map((w, i) => (
                <li key={w.name} className="flex items-center gap-2 sm:gap-3 py-2">
                  <span className="font-display text-lg sm:text-2xl text-primary w-5 sm:w-6">{i + 1}</span>
                  <span className="flex-1 truncate text-xs sm:text-sm">{w.name}</span>
                  <span className="text-muted-foreground text-xs">{w.orders} órd.</span>
                  <span className="font-semibold text-xs sm:text-sm whitespace-nowrap">{formatCRC(w.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="pos-card p-3 sm:p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        <span className="truncate">{label}</span>
      </div>
      <div className="font-display text-xl sm:text-2xl mt-1 truncate">{formatCRC(value)}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="text-center py-8 sm:py-12 text-xs sm:text-sm text-muted-foreground">
      Sin datos todavía. Cobra órdenes para ver estadísticas.
    </div>
  );
}
