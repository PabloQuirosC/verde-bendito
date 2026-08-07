import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VentasProductoChart({ data = [] }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { name: "Producto 1", total: 4000 },
    { name: "Producto 2", total: 3000 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₡${value / 1000}k`} />
        <YAxis dataKey="name" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip formatter={(value) => `₡${value}`} />
        <Bar dataKey="total" fill="#10b981" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}