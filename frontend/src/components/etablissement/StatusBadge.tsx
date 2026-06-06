import { Badge } from "@/components/ui/badge";

type StatusKind = "actif" | "inactif" | "cloture" | "complete";

interface StatusBadgeProps {
  status: StatusKind;
  label?: string;
}

const CONFIG: Record<StatusKind, { variant: "success" | "muted" | "warning" | "destructive"; text: string }> = {
  actif: { variant: "success", text: "Active" },
  inactif: { variant: "muted", text: "Inactive" },
  cloture: { variant: "warning", text: "Clôturée" },
  complete: { variant: "destructive", text: "Complète" },
};

export function StatusBadge({ status, label }: StatusBadgeProps): React.JSX.Element {
  const meta = CONFIG[status];
  return <Badge variant={meta.variant}>{label ?? meta.text}</Badge>;
}
