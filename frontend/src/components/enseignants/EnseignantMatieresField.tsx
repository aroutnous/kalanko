import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { getClasseAbbreviation } from "@/lib/etablissement-utils";
import { ENSEIGNANTS_API } from "@/lib/enseignants-api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import type { Matiere } from "@/types";

interface EnseignantMatieresFieldProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
}

function matiereLabel(matiere: Matiere): string {
  const classe = matiere.classe_nom ? getClasseAbbreviation(matiere.classe_nom) : "—";
  return `${matiere.nom} — ${classe}`;
}

export function EnseignantMatieresField({
  selectedIds,
  onChange,
  disabled = false,
}: EnseignantMatieresFieldProps): React.JSX.Element {
  const { data: matieres = [], isLoading } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres);
      return data;
    },
  });

  const sortedMatieres = useMemo(
    () =>
      [...matieres].sort((a, b) =>
        matiereLabel(a).localeCompare(matiereLabel(b), "fr"),
      ),
    [matieres],
  );

  const toggleMatiere = (matiereId: string, checked: boolean): void => {
    if (checked) {
      onChange([...new Set([...selectedIds, matiereId])]);
      return;
    }
    onChange(selectedIds.filter((id) => id !== matiereId));
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (sortedMatieres.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucune matière créée pour le moment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Label>Matières enseignées (optionnel)</Label>
      <ScrollArea className="max-h-48 rounded-md border border-border p-3">
        <div className="space-y-2">
          {sortedMatieres.map((matiere) => (
            <label
              key={matiere.id}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                checked={selectedIds.includes(matiere.id)}
                onChange={(e) => toggleMatiere(matiere.id, e.target.checked)}
                disabled={disabled}
              />
              {matiereLabel(matiere)}
            </label>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export async function syncEnseignantMatieres(
  enseignantId: string,
  selectedIds: string[],
  previousIds: string[],
): Promise<void> {
  const selected = new Set(selectedIds);
  const previous = new Set(previousIds);

  const toAdd = selectedIds.filter((id) => !previous.has(id));
  const toRemove = previousIds.filter((id) => !selected.has(id));

  await Promise.all([
    ...toAdd.map((matiereId) =>
      api.post(ENSEIGNANTS_API.matieres(enseignantId), { matiere_id: matiereId }),
    ),
    ...toRemove.map((matiereId) =>
      api.delete(ENSEIGNANTS_API.matiere(enseignantId, matiereId)),
    ),
  ]);
}
