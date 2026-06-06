import { FinanceStatCard } from "@/components/finance/FinanceStatCard";

export interface KpiItem {
  label: string;
  value: string;
  color?: "green" | "red" | "blue" | "amber";
  trend?: string;
}

interface KpiGridProps {
  items: KpiItem[];
}

export function KpiGrid({ items }: KpiGridProps): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucun indicateur disponible</p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <FinanceStatCard
          key={item.label}
          label={item.label}
          value={item.value}
          color={item.color}
          trend={item.trend}
        />
      ))}
    </div>
  );
}
