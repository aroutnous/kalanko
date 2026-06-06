import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toastStore";

export function ToastContainer(): React.JSX.Element {
  const { toasts, dismiss } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="alert"
          className={cn(
            "flex min-w-[280px] items-center justify-between rounded-lg border px-4 py-3 text-sm shadow-lg",
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-red-200 bg-red-50 text-red-900",
          )}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            className="ml-3 opacity-70 hover:opacity-100"
            onClick={() => dismiss(toast.id)}
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
