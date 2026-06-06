import { Badge } from "@/components/ui/badge";
import type { MentionScolaire } from "@/types";

const CONFIG: Record<
  MentionScolaire,
  { className: string; label: string }
> = {
  "Très Bien": { className: "bg-emerald-100 text-emerald-800", label: "Très Bien" },
  Bien: { className: "bg-blue-100 text-blue-800", label: "Bien" },
  "Assez Bien": { className: "bg-cyan-100 text-cyan-800", label: "Assez Bien" },
  Passable: { className: "bg-amber-100 text-amber-800", label: "Passable" },
  Insuffisant: { className: "bg-red-100 text-red-800", label: "Insuffisant" },
};

interface MentionBadgeProps {
  mention: string | null | undefined;
}

export function MentionBadge({ mention }: MentionBadgeProps): React.JSX.Element {
  if (!mention) {
    return <Badge variant="muted">—</Badge>;
  }
  const key = mention as MentionScolaire;
  if (key in CONFIG) {
    const meta = CONFIG[key];
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
      >
        {meta.label}
      </span>
    );
  }
  return <Badge variant="muted">{mention}</Badge>;
}
