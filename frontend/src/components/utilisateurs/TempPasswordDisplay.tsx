import { Copy, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useToastStore } from "@/stores/toastStore";

interface TempPasswordDisplayProps {
  password: string;
  onExpire?: () => void;
}

export function TempPasswordDisplay({
  password,
  onExpire,
}: TempPasswordDisplayProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const [visible, setVisible] = useState(true);
  const [showPlain, setShowPlain] = useState(true);

  useEffect(() => {
    setVisible(true);
    setShowPlain(true);
    const timer = window.setTimeout(() => {
      setVisible(false);
      onExpire?.();
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [password, onExpire]);

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(password);
      toast("Mot de passe copié");
    } catch {
      toast("Impossible de copier le mot de passe", "error");
    }
  };

  if (!visible) {
    return (
      <p className="text-sm text-muted-foreground">
        Le mot de passe temporaire a été masqué pour des raisons de sécurité.
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p className="text-sm font-medium text-amber-900">Mot de passe temporaire</p>
      <p className="text-xs text-amber-800">
        Affiché une seule fois — masqué automatiquement dans 30 secondes.
      </p>
      <div className="flex items-center gap-2">
        <code className="flex-1 break-all font-mono text-sm text-amber-950">
          {showPlain ? password : "•".repeat(password.length)}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowPlain((v) => !v)}
          aria-label={showPlain ? "Masquer" : "Afficher"}
        >
          {showPlain ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => void handleCopy()}>
          <Copy className="mr-1 h-4 w-4" />
          Copier
        </Button>
      </div>
    </div>
  );
}
