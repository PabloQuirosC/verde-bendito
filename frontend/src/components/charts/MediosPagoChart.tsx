import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function MediosPagoChart({ data = [] }: { data: any[] }) {
  const chartData = data.length > 0 ? data : [
    { name: "Débito", value: 4000 },
    { name: "Efectivo", value: 3000 },
  ];

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
          {chartData.map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => `₡${value}`} />
      </PieChart>
    </ResponsiveContainer>
  );
}