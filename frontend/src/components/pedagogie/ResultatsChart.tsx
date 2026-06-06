import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ChartDatum {
  matiere: string;
  moyenne: number;
}

interface ResultatsChartProps {
  data: ChartDatum[];
}

export function ResultatsChart({ data }: ResultatsChartProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aucune donnée à afficher
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="matiere"
            tick={{ fontSize: 12 }}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={60}
          />
          <YAxis domain={[0, 20]} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => {
              const num = typeof value === "number" ? value : Number(value);
              return [`${num.toFixed(2)} / 20`, "Moyenne"];
            }}
          />
          <Bar dataKey="moyenne" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
