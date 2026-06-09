import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({
  className,
  checked,
  onCheckedChange,
  onChange,
  ...props
}: CheckboxProps): React.JSX.Element {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => {
        onChange?.(event);
        onCheckedChange?.(event.target.checked);
      }}
      className={cn(
        "h-4 w-4 shrink-0 rounded border border-input accent-primary",
        className,
      )}
      {...props}
    />
  );
}
