import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import {
  displayCycleLabel,
  getClasseAbbreviation,
  getSalleDisplayName,
} from "@/lib/etablissement-utils";
import { ENSEIGNANTS_API } from "@/lib/enseignants-api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type {
  ClasseNiveau,
  Cycle,
  Enseignant,
  EtablissementStructure,
  Matiere,
  Salle,
} from "@/types";

interface SalleRow {
  salleId: string;
  classeId: string;
  classe: ClasseNiveau;
  cycle: Cycle;
  salle: Salle;
  label: string;
}

interface ClasseSelectionParams {
  classeId: string;
  cycle: Cycle;
  label: string;
  salleIds: string[];
  coefficient: string;
  note_max: string;
  enseignant_principal_id: string;
  enseignant_assistant_id: string;
  matiereId?: string;
}

const EMPTY_MATIERES: Matiere[] = [];

interface MatiereFormModalProps {
  open: boolean;
  onClose: () => void;
  editNom?: string | null;
}

function formatEnseignant(e: Enseignant): string {
  return `${e.prenom} ${e.nom}`.trim();
}

function defaultNoteMaxForCycle(cycle: Cycle): string {
  if (cycle.type_evaluation === "qualitative") return "";
  if (cycle.nom === "1er Cycle") return "10";
  if (cycle.nom === "2eme Cycle") return "20";
  return cycle.note_max != null ? String(cycle.note_max) : "20";
}

function buildSalleRows(structure: EtablissementStructure): SalleRow[] {
  const rows: SalleRow[] = [];

  for (const cycle of structure.cycles) {
    for (const classe of cycle.classes) {
      if (classe.salles.length > 0) {
        for (const salle of classe.salles) {
          rows.push({
            salleId: salle.id,
            classeId: classe.id,
            classe,
            cycle,
            salle,
            label: getSalleDisplayName(salle, classe),
          });
        }
      } else {
        rows.push({
          salleId: `classe-${classe.id}`,
          classeId: classe.id,
          classe,
          cycle,
          salle: {
            id: `classe-${classe.id}`,
            tenant_id: classe.tenant_id,
            classe_id: classe.id,
            annee_scolaire_id: "",
            nom: classe.nom,
            nom_salle: null,
            capacite: null,
          },
          label: getClasseAbbreviation(classe.nom),
        });
      }
    }
  }

  return rows;
}

function buildPayload(
  nom: string,
  params: ClasseSelectionParams,
  ordre: number,
  estObligatoire: boolean,
  estDomaineCompetence: boolean,
): Record<string, unknown> {
  return {
    nom: nom.trim(),
    classe_id: params.classeId,
    coefficient: Number(params.coefficient),
    note_max: params.note_max.trim() ? Number(params.note_max) : null,
    est_obligatoire: estObligatoire,
    est_domaine_competence: estDomaineCompetence,
    ordre,
    est_active: true,
    enseignant_principal_id: params.enseignant_principal_id || null,
    enseignant_assistant_id: params.enseignant_assistant_id || null,
  };
}

export function MatiereFormModal({
  open,
  onClose,
  editNom = null,
}: MatiereFormModalProps): React.JSX.Element | null {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const isEdit = Boolean(editNom);

  const [nom, setNom] = useState("");
  const [abreviation, setAbreviation] = useState("");
  const [estObligatoire, setEstObligatoire] = useState(true);
  const [estDomaineCompetence, setEstDomaineCompetence] = useState(false);
  const [selectionOrder, setSelectionOrder] = useState<string[]>([]);
  const [selections, setSelections] = useState<Record<string, ClasseSelectionParams>>({});
  const [checkedSalles, setCheckedSalles] = useState<Record<string, boolean>>({});
  const formInitializedRef = useRef(false);

  const resetCreateForm = (): void => {
    setNom("");
    setAbreviation("");
    setEstObligatoire(true);
    setEstDomaineCompetence(false);
    setSelectionOrder([]);
    setSelections({});
    setCheckedSalles({});
  };

  const populateEditForm = (matieres: Matiere[], rows: SalleRow[]): void => {
    const first = matieres[0];
    setNom(first.nom);
    setAbreviation("");
    setEstObligatoire(first.est_obligatoire);
    setEstDomaineCompetence(first.est_domaine_competence);

    const nextSelections: Record<string, ClasseSelectionParams> = {};
    const nextChecked: Record<string, boolean> = {};
    const order: string[] = [];

    const sortedExisting = [...matieres].sort((a, b) => a.ordre - b.ordre);
    for (const matiere of sortedExisting) {
      const row = rows.find((r) => r.classeId === matiere.classe_id);
      if (!row) continue;

      order.push(matiere.classe_id);
      nextSelections[matiere.classe_id] = {
        classeId: matiere.classe_id,
        cycle: row.cycle,
        label: row.label,
        salleIds: rows
          .filter((r) => r.classeId === matiere.classe_id)
          .map((r) => r.salleId),
        coefficient: String(matiere.coefficient),
        note_max: matiere.note_max != null ? String(matiere.note_max) : "",
        enseignant_principal_id: matiere.enseignant_principal_id ?? "",
        enseignant_assistant_id: matiere.enseignant_assistant_id ?? "",
        matiereId: matiere.id,
      };

      for (const salleRow of rows.filter((r) => r.classeId === matiere.classe_id)) {
        nextChecked[salleRow.salleId] = true;
      }
    }

    setSelectionOrder(order);
    setSelections(nextSelections);
    setCheckedSalles(nextChecked);
  };

  const { data: structure, isLoading: loadingStructure } = useQuery({
    queryKey: ["etablissement-structure"],
    queryFn: async () => {
      const { data } = await api.get<EtablissementStructure>(ETABLISSEMENT_API.structure);
      return data;
    },
    enabled: open,
  });

  const { data: enseignants = [], isLoading: loadingEnseignants } = useQuery({
    queryKey: ["enseignants"],
    queryFn: async () => {
      const { data } = await api.get<Enseignant[]>(ENSEIGNANTS_API.list);
      return data;
    },
    enabled: open,
  });

  const { data: existingMatieres = EMPTY_MATIERES, isLoading: loadingExisting } = useQuery({
    queryKey: ["matieres", "by-nom", editNom],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres, {
        params: { nom: editNom },
      });
      return data;
    },
    enabled: open && isEdit && Boolean(editNom),
  });

  const salleRows = useMemo(
    () => (structure ? buildSalleRows(structure) : []),
    [structure],
  );

  const cyclesWithRows = useMemo(() => {
    const map = new Map<string, { cycle: Cycle; rows: SalleRow[] }>();
    for (const row of salleRows) {
      const entry = map.get(row.cycle.id) ?? { cycle: row.cycle, rows: [] };
      entry.rows.push(row);
      map.set(row.cycle.id, entry);
    }
    return [...map.values()].sort(
      (a, b) => a.cycle.ordre - b.cycle.ordre || a.cycle.nom.localeCompare(b.cycle.nom, "fr"),
    );
  }, [salleRows]);

  const selectedCycleIds = useMemo(() => {
    const ids = new Set<string>();
    for (const classeId of selectionOrder) {
      const params = selections[classeId];
      if (params) ids.add(params.cycle.id);
    }
    return ids;
  }, [selectionOrder, selections]);

  const hasQualitativeSelected = useMemo(
    () =>
      cyclesWithRows.some(
        ({ cycle }) =>
          selectedCycleIds.has(cycle.id) && cycle.type_evaluation === "qualitative",
      ),
    [cyclesWithRows, selectedCycleIds],
  );

  const enseignantOptions = useMemo(
    () =>
      enseignants
        .filter((e) => e.statut === "actif")
        .sort((a, b) => formatEnseignant(a).localeCompare(formatEnseignant(b), "fr")),
    [enseignants],
  );

  useEffect(() => {
    if (!open) {
      formInitializedRef.current = false;
      return;
    }

    if (formInitializedRef.current) return;

    if (!isEdit) {
      resetCreateForm();
      formInitializedRef.current = true;
      return;
    }

    if (loadingExisting || salleRows.length === 0) return;
    if (existingMatieres.length === 0) return;

    populateEditForm(existingMatieres, salleRows);
    formInitializedRef.current = true;
  }, [
    open,
    isEdit,
    loadingExisting,
    existingMatieres,
    salleRows,
  ]);

  const toggleSalle = (row: SalleRow, checked: boolean): void => {
    const classeId = row.classeId;

    if (checked) {
      setCheckedSalles((prev) => {
        const next = { ...prev };
        for (const salleRow of salleRows.filter((r) => r.classeId === classeId)) {
          next[salleRow.salleId] = true;
        }
        return next;
      });

      setSelections((prev) => {
        if (prev[classeId]) return prev;
        return {
          ...prev,
          [classeId]: {
            classeId,
            cycle: row.cycle,
            label: getClasseAbbreviation(row.classe.nom),
            salleIds: salleRows
              .filter((r) => r.classeId === classeId)
              .map((r) => r.salleId),
            coefficient: "1",
            note_max: defaultNoteMaxForCycle(row.cycle),
            enseignant_principal_id: "",
            enseignant_assistant_id: "",
          },
        };
      });

      setSelectionOrder((prev) => (prev.includes(classeId) ? prev : [...prev, classeId]));
      return;
    }

    setCheckedSalles((prev) => {
      const next = { ...prev };
      for (const salleRow of salleRows.filter((r) => r.classeId === classeId)) {
        delete next[salleRow.salleId];
      }
      return next;
    });
    setSelections((prev) => {
      const next = { ...prev };
      delete next[classeId];
      return next;
    });
    setSelectionOrder((prev) => prev.filter((id) => id !== classeId));
  };

  const updateSelection = (
    classeId: string,
    patch: Partial<ClasseSelectionParams>,
  ): void => {
    setSelections((prev) => ({
      ...prev,
      [classeId]: { ...prev[classeId], ...patch },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const trimmedNom = nom.trim();
      if (!trimmedNom) throw new Error("Le nom est requis");
      if (selectionOrder.length === 0) {
        throw new Error("Sélectionnez au moins une salle");
      }

      const existingByClasse = new Map(
        existingMatieres.map((m) => [m.classe_id, m]),
      );

      const tasks: Promise<unknown>[] = [];

      selectionOrder.forEach((classeId, index) => {
        const params = selections[classeId];
        if (!params) return;

        const body = buildPayload(
          trimmedNom,
          params,
          index + 1,
          estObligatoire,
          estDomaineCompetence,
        );
        const existing = existingByClasse.get(classeId);

        if (existing) {
          tasks.push(api.put(`${ETABLISSEMENT_API.matieres}/${existing.id}`, body));
        } else {
          tasks.push(api.post(ETABLISSEMENT_API.matieres, body));
        }
      });

      for (const matiere of existingMatieres) {
        if (!selectionOrder.includes(matiere.classe_id)) {
          tasks.push(api.delete(`${ETABLISSEMENT_API.matieres}/${matiere.id}`));
        }
      }

      await Promise.all(tasks);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      void queryClient.invalidateQueries({ queryKey: ["etablissement-structure"] });
      toast(isEdit ? "Matière modifiée" : "Matière créée");
      onClose();
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const isLoading = loadingStructure || loadingEnseignants || (isEdit && loadingExisting);
  const canSubmit = nom.trim().length > 0 && selectionOrder.length > 0 && !saveMutation.isPending;

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} className="max-w-3xl">
      <h2 className="mb-1 pr-8 text-lg font-semibold">
        {isEdit ? "Modifier la matière" : "Ajouter une matière"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Définissez les informations communes puis assignez la matière à une ou plusieurs salles.
      </p>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) saveMutation.mutate();
          }}
          className="space-y-6"
        >
          <section className="space-y-4 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold">Informations communes</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="matiere-nom">Nom *</Label>
                <Input
                  id="matiere-nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="matiere-abrev">Abréviation</Label>
                <Input
                  id="matiere-abrev"
                  value={abreviation}
                  onChange={(e) => setAbreviation(e.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={estObligatoire}
                  onChange={(e) => setEstObligatoire(e.target.checked)}
                />
                Obligatoire
              </label>
              {hasQualitativeSelected ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={estDomaineCompetence}
                    onChange={(e) => setEstDomaineCompetence(e.target.checked)}
                  />
                  Domaine de compétence
                </label>
              ) : null}
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">Classes concernées</h3>
              <span className="text-xs text-muted-foreground">
                {selectionOrder.length} sélectionnée{selectionOrder.length > 1 ? "s" : ""}
              </span>
            </div>

            {cyclesWithRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune classe configurée. Configurez d&apos;abord la structure de
                l&apos;établissement.
              </p>
            ) : (
              <ScrollArea className="max-h-[22rem] pr-2">
                <div className="space-y-4">
                  {cyclesWithRows.map(({ cycle, rows }) => (
                    <div key={cycle.id} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {displayCycleLabel(cycle.nom)}
                      </p>
                      <div className="space-y-2">
                        {rows.map((row) => {
                          const isChecked = Boolean(checkedSalles[row.salleId]);
                          const params = selections[row.classeId];
                          const isQualitative = cycle.type_evaluation === "qualitative";
                          const isFirstInClasse =
                            rows.find((r) => r.classeId === row.classeId)?.salleId ===
                            row.salleId;

                          return (
                            <div
                              key={row.salleId}
                              className="rounded-md border border-border/80 p-3"
                            >
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <Checkbox
                                  id={`matiere-salle-${row.salleId}`}
                                  checked={isChecked}
                                  onCheckedChange={(checked) => toggleSalle(row, checked)}
                                />
                                <Label
                                  htmlFor={`matiere-salle-${row.salleId}`}
                                  className="cursor-pointer font-medium"
                                >
                                  {row.label}
                                </Label>
                              </div>

                              {isChecked && params && isFirstInClasse ? (
                                <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2">
                                  <div className="space-y-1">
                                    <Label>Coefficient *</Label>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      value={params.coefficient}
                                      onChange={(e) =>
                                        updateSelection(row.classeId, {
                                          coefficient: e.target.value,
                                        })
                                      }
                                      required
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Note max</Label>
                                    <Input
                                      type="number"
                                      min="0.1"
                                      step="0.1"
                                      value={params.note_max}
                                      onChange={(e) =>
                                        updateSelection(row.classeId, {
                                          note_max: e.target.value,
                                        })
                                      }
                                      disabled={isQualitative}
                                      placeholder={
                                        isQualitative
                                          ? "Qualitatif"
                                          : defaultNoteMaxForCycle(cycle)
                                      }
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Enseignant principal</Label>
                                    <Select
                                      value={params.enseignant_principal_id}
                                      onChange={(e) =>
                                        updateSelection(row.classeId, {
                                          enseignant_principal_id: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">Aucun</option>
                                      {enseignantOptions.map((e) => (
                                        <option key={e.id} value={e.id}>
                                          {formatEnseignant(e)}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label>Enseignant assistant</Label>
                                    <Select
                                      value={params.enseignant_assistant_id}
                                      onChange={(e) =>
                                        updateSelection(row.classeId, {
                                          enseignant_assistant_id: e.target.value,
                                        })
                                      }
                                    >
                                      <option value="">Aucun</option>
                                      {enseignantOptions.map((e) => (
                                        <option key={e.id} value={e.id}>
                                          {formatEnseignant(e)}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </section>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saveMutation.isPending}>
              Annuler
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {saveMutation.isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Créer"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
