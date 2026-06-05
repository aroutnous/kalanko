import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps): React.JSX.Element {
  return (
    <label
      className={cn("text-sm font-medium leading-none text-foreground", className)}
      {...props}
    />
  );
}
