import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function VentasMensualesChart({ data = [] }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { name: 'Ene', total: 5000 },
    { name: 'Feb', total: 6000 },
    { name: 'Mar', total: 7000 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₡${value / 1000}k`} />
        <Tooltip formatter={(value) => `₡${value}`} />
        <Bar dataKey="total" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}