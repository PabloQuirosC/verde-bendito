import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function VentasDiariasChart({ data = [] }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { name: "Día 1", total: 5000 },
    { name: "Día 2", total: 6000 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₡${value / 1000}k`} />
        <Tooltip formatter={(value) => `₡${value}`} />
        <Area type="monotone" dataKey="total" stroke="#10b981" fill="#d1fae5" />
      </AreaChart>
    </ResponsiveContainer>
  );
}