import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function CanalesVentaChart({ data = [] }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { name: "Local", value: 45 },
    { name: "Para llevar", value: 28 },
    { name: "Delivery", value: 22 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={4}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `₡${Number(value).toLocaleString("es-CR")}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}