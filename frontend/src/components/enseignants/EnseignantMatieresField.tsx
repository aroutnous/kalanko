import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import {
  displayCycleLabel,
  getClasseAbbreviation,
} from "@/lib/etablissement-utils";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import type { Matiere } from "@/types";

interface EnseignantMatieresFieldProps {
  enseignantId: string;
}

function matiereLabel(matiere: Matiere): string {
  const cycle = matiere.cycle_nom ? `${displayCycleLabel(matiere.cycle_nom)} · ` : "";
  const classe = matiere.classe_nom ? getClasseAbbreviation(matiere.classe_nom) : "—";
  return `${matiere.nom} — ${cycle}${classe}`;
}

export function EnseignantMatieresField({
  enseignantId,
}: EnseignantMatieresFieldProps): React.JSX.Element {
  const { data: matieres = [], isLoading } = useQuery({
    queryKey: ["matieres", "by-enseignant", enseignantId],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres, {
        params: { enseignant_id: enseignantId },
      });
      return data;
    },
    enabled: Boolean(enseignantId),
  });

  const sortedMatieres = useMemo(
    () =>
      [...matieres].sort((a, b) =>
        matiereLabel(a).localeCompare(matiereLabel(b), "fr"),
      ),
    [matieres],
  );

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-2">
      <Label>Matières enseignées</Label>
      {sortedMatieres.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune matière assignée — assignez cet enseignant depuis la page Matières.
        </p>
      ) : (
        <ScrollArea className="max-h-48 rounded-md border border-border p-3">
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {sortedMatieres.map((matiere) => (
              <li key={matiere.id}>{matiereLabel(matiere)}</li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
