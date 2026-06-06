import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ChartType = "bar" | "line" | "pie" | "grouped-bar";

export interface ChartDatum {
  label: string;
  value: number;
  value2?: number;
}

interface StatsChartProps {
  type: ChartType;
  data: ChartDatum[];
  valueLabel?: string;
  value2Label?: string;
  height?: number;
  pieColors?: string[];
}

const DEFAULT_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#f59e0b", "#0891b2"];

export function StatsChart({
  type,
  data,
  valueLabel = "Valeur",
  value2Label = "Valeur 2",
  height = 280,
  pieColors = DEFAULT_COLORS,
}: StatsChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune donnée à afficher
      </p>
    );
  }

  const chartData = data.map((d) => ({
    name: d.label,
    value: d.value,
    value2: d.value2 ?? 0,
  }));

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "line" ? (
          <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="value"
              name={valueLabel}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        ) : type === "pie" ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              label={({ name, value }) => `${name}: ${value}%`}
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : type === "grouped-bar" ? (
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name={valueLabel} fill="#16a34a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="value2" name={value2Label} fill="#dc2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : (
          <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" name={valueLabel} fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
