import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { STATUT_COMPETENCE_OPTIONS } from "@/lib/pedagogie-utils";
import type { Eleve, Matiere, TypeEvaluation } from "@/types";

export interface NoteCellValue {
  valeur: string;
  valeur_qualitative: string;
  appreciation: string;
  noteId?: string;
}

export type NotesGridState = Record<string, NoteCellValue>;

export function cellKey(eleveId: string, matiereId: string): string {
  return `${eleveId}:${matiereId}`;
}

interface NotesGridProps {
  eleves: Eleve[];
  matiere: Matiere | null;
  values: NotesGridState;
  typeEvaluation: TypeEvaluation;
  noteMax: number;
  notePassage: number;
  readOnly?: boolean;
  onChange: (key: string, field: keyof NoteCellValue, value: string) => void;
}

export function NotesGrid({
  eleves,
  matiere,
  values,
  typeEvaluation,
  noteMax,
  notePassage,
  readOnly = false,
  onChange,
}: NotesGridProps): React.JSX.Element {
  if (!matiere) {
    return (
      <p className="text-sm text-muted-foreground">
        Sélectionnez une matière pour afficher la grille de saisie.
      </p>
    );
  }

  if (eleves.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun élève inscrit dans cette salle.
      </p>
    );
  }

  const isQualitative = typeEvaluation === "qualitative";

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-3 py-2 font-medium">Élève</th>
            <th className="border-l border-border px-3 py-2 font-medium">
              {isQualitative ? "Statut" : `Note / ${noteMax}`}
            </th>
            <th className="border-l border-border px-3 py-2 font-medium">
              Appréciation
            </th>
          </tr>
        </thead>
        <tbody>
          {eleves.map((eleve) => {
            const key = cellKey(eleve.id, matiere.id);
            const cell = values[key] ?? {
              valeur: "",
              valeur_qualitative: "",
              appreciation: "",
            };
            const num = cell.valeur !== "" ? Number(cell.valeur) : null;
            const belowPassage =
              !isQualitative &&
              num !== null &&
              !Number.isNaN(num) &&
              num < notePassage;

            return (
              <tr key={eleve.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {eleve.nom} {eleve.prenom}
                </td>
                <td className="border-l border-border p-2">
                  {isQualitative ? (
                    <Select
                      value={cell.valeur_qualitative}
                      disabled={readOnly}
                      onChange={(e) =>
                        onChange(key, "valeur_qualitative", e.target.value)
                      }
                      className="h-9 w-full min-w-[200px]"
                    >
                      <option value="">—</option>
                      {STATUT_COMPETENCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      min={0}
                      max={noteMax}
                      step={0.01}
                      value={cell.valeur}
                      disabled={readOnly}
                      onChange={(e) => onChange(key, "valeur", e.target.value)}
                      className={`h-9 text-center ${belowPassage ? "border-red-500 text-red-600" : ""}`}
                      placeholder={`0 – ${noteMax}`}
                    />
                  )}
                </td>
                <td className="border-l border-border p-2">
                  <Input
                    value={cell.appreciation}
                    disabled={readOnly}
                    onChange={(e) => onChange(key, "appreciation", e.target.value)}
                    className="h-9"
                    placeholder="Appréciation"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
