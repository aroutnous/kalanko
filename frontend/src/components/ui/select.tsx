import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export function Select({ className, children, ...props }: SelectProps): React.JSX.Element {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
