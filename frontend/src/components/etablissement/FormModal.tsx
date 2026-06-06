import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface FormModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
  children: React.ReactNode;
}

export function FormModal({
  open,
  title,
  onClose,
  onSubmit,
  loading = false,
  submitLabel = "Enregistrer",
  children,
}: FormModalProps): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="mb-4 pr-8 text-lg font-semibold">{title}</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {children}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Enregistrement…" : submitLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
