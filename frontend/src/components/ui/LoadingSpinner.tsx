import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  label?: string;
}

export function LoadingSpinner({
  className,
  label = "Chargement…",
}: LoadingSpinnerProps): React.JSX.Element {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-12", className)}>
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}
