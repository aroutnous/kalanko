import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { displayCycleLabel } from "@/lib/etablissement-utils";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { Cycle, CycleUpdatePayload } from "@/types";

interface NotationDraft {
  note_max: string;
  note_passage: string;
  arrondi: string;
}

function cycleToDraft(cycle: Cycle): NotationDraft {
  return {
    note_max: cycle.note_max != null ? String(cycle.note_max) : "20",
    note_passage: cycle.note_passage != null ? String(cycle.note_passage) : "10",
    arrondi: cycle.arrondi != null ? String(cycle.arrondi) : "2",
  };
}

function buildPayload(cycle: Cycle, draft: NotationDraft): CycleUpdatePayload | null {
  if (cycle.type_evaluation === "qualitative") {
    return {
      type_evaluation: "qualitative",
      note_max: null,
      note_passage: null,
      arrondi: null,
    };
  }

  const max = Number(draft.note_max);
  const passage = Number(draft.note_passage);
  if (!Number.isFinite(max) || max <= 0) return null;
  if (!Number.isFinite(passage) || passage < 0) return null;
  if (passage > max) return null;

  return {
    type_evaluation: "chiffree",
    note_max: max,
    note_passage: passage,
    arrondi: Number(draft.arrondi),
  };
}

export function NotationParCycleTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [drafts, setDrafts] = useState<Record<string, NotationDraft>>({});

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const { data } = await api.get<Cycle[]>(ETABLISSEMENT_API.cycles);
      return data;
    },
  });

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr")),
    [cycles],
  );

  useEffect(() => {
    if (cycles.length === 0) return;
    setDrafts((prev) => {
      const next = { ...prev };
      for (const cycle of cycles) {
        next[cycle.id] = cycleToDraft(cycle);
      }
      return next;
    });
  }, [cycles]);

  const saveAllMutation = useMutation({
    mutationFn: async (payloads: Array<{ cycleId: string; body: CycleUpdatePayload }>) => {
      await Promise.all(
        payloads.map(({ cycleId, body }) =>
          api.put<Cycle>(`${ETABLISSEMENT_API.cycles}/${cycleId}`, body),
        ),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cycles"] });
      toast("Modifications enregistrées");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const handleSaveAll = (): void => {
    const payloads: Array<{ cycleId: string; body: CycleUpdatePayload }> = [];

    for (const cycle of sortedCycles) {
      const draft = drafts[cycle.id];
      if (!draft) continue;

      const body = buildPayload(cycle, draft);
      if (!body) {
        if (cycle.type_evaluation !== "qualitative") {
          toast(`Notation invalide pour ${displayCycleLabel(cycle.nom)}`, "error");
        }
        return;
      }

      payloads.push({ cycleId: cycle.id, body });
    }

    saveAllMutation.mutate(payloads);
  };

  if (isLoading) return <LoadingSpinner />;

  if (sortedCycles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun cycle configuré. Complétez d&apos;abord le wizard établissement.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        La notation est définie par cycle. Les valeurs s&apos;appliquent à toutes les
        classes du cycle concerné.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {sortedCycles.map((cycle) => {
          const draft = drafts[cycle.id];
          const isQualitative = cycle.type_evaluation === "qualitative";

          return (
            <Card key={cycle.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <CardTitle className="text-base">
                      {displayCycleLabel(cycle.nom)}
                    </CardTitle>
                    {isQualitative ? (
                      <Badge variant="warning">Qualitatif</Badge>
                    ) : (
                      <Badge variant="default">Chiffré</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isQualitative ? (
                  <p className="text-sm text-muted-foreground">
                    Évaluation par compétences, sans note numérique.
                  </p>
                ) : draft ? (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor={`note_max_${cycle.id}`}>Note maximale</Label>
                      <Input
                        id={`note_max_${cycle.id}`}
                        type="number"
                        min="1"
                        step="0.01"
                        value={draft.note_max}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [cycle.id]: { ...draft, note_max: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`note_passage_${cycle.id}`}>Note de passage</Label>
                      <Input
                        id={`note_passage_${cycle.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={draft.note_passage}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [cycle.id]: { ...draft, note_passage: e.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`arrondi_${cycle.id}`}>Arrondi (décimales)</Label>
                      <Select
                        id={`arrondi_${cycle.id}`}
                        value={draft.arrondi}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [cycle.id]: { ...draft, arrondi: e.target.value },
                          }))
                        }
                      >
                        <option value="0">0 décimale</option>
                        <option value="1">1 décimale</option>
                        <option value="2">2 décimales</option>
                      </Select>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          disabled={saveAllMutation.isPending}
          onClick={handleSaveAll}
        >
          {saveAllMutation.isPending ? "Enregistrement…" : "Enregistrer les modifications"}
        </Button>
      </div>
    </div>
  );
}
