import { EleveStatutBadge } from "@/components/eleves/EleveStatutBadge";
import { Card, CardContent } from "@/components/ui/card";
import type { Eleve } from "@/types";

interface EleveCardProps {
  eleve: Eleve;
  classeNom?: string;
}

export function EleveCard({ eleve, classeNom }: EleveCardProps): React.JSX.Element {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Matricule {eleve.matricule}</p>
          <p className="text-xl font-semibold">
            {eleve.nom} {eleve.prenom}
          </p>
          {classeNom ? (
            <p className="text-sm text-muted-foreground">Classe : {classeNom}</p>
          ) : null}
        </div>
        <EleveStatutBadge statut={eleve.statut} />
      </CardContent>
    </Card>
  );
}
