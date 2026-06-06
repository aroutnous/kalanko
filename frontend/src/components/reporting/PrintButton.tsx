import { Printer } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/api";
import { downloadPdf } from "@/lib/download";
import { useToastStore } from "@/stores/toastStore";

interface PrintButtonProps {
  url: string;
  filename: string;
  label?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | null;
}

export function PrintButton({
  url,
  filename,
  label = "Imprimer PDF",
  disabled = false,
  variant = "outline",
  size = "sm",
}: PrintButtonProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const [loading, setLoading] = useState(false);

  const handlePrint = async (): Promise<void> => {
    setLoading(true);
    try {
      await downloadPdf(url, filename);
      toast("Document téléchargé");
    } catch (err) {
      toast(getErrorMessage(err), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size ?? undefined}
      disabled={disabled || loading}
      onClick={() => void handlePrint()}
    >
      {loading ? (
        "Génération…"
      ) : (
        <>
          <Printer className="mr-2 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
