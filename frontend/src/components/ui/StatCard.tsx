import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color?: "blue" | "green" | "orange" | "purple";
}

const colorMap = {
  blue: "bg-blue-50 text-blue-700",
  green: "bg-emerald-50 text-emerald-700",
  orange: "bg-orange-50 text-orange-700",
  purple: "bg-purple-50 text-purple-700",
};

export function StatCard({
  title,
  value,
  icon: Icon,
  color = "blue",
}: StatCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn("rounded-lg p-3", colorMap[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
