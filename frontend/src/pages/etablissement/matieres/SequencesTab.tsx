import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  ChevronDown,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { displayCycleLabel } from "@/lib/etablissement-utils";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, Cycle, Periode, SequenceEvaluation } from "@/types";

interface SequenceForm {
  nom: string;
  cycle_id: string;
  periode_id: string;
  date_debut: string;
  date_fin: string;
  ordre: string;
}

interface CycleSequencesGroup {
  cycle: Cycle;
  periodes: Array<{
    periode: Periode;
    sequences: SequenceEvaluation[];
  }>;
  sequenceCount: number;
}

const INITIAL: SequenceForm = {
  nom: "",
  cycle_id: "",
  periode_id: "",
  date_debut: "",
  date_fin: "",
  ordre: "0",
};

function toPayload(form: SequenceForm): Record<string, unknown> {
  return {
    nom: form.nom,
    cycle_id: form.cycle_id,
    periode_id: form.periode_id,
    date_debut: form.date_debut || null,
    date_fin: form.date_fin || null,
    ordre: Number(form.ordre) || 0,
  };
}

function accordionKey(cycleId: string, periodeId: string): string {
  return `${cycleId}:${periodeId}`;
}

export function SequencesTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SequenceEvaluation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SequenceEvaluation | null>(null);
  const [form, setForm] = useState<SequenceForm>(INITIAL);

  const { data: anneeActive, isLoading: loadingAnnee } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>(ETABLISSEMENT_API.anneeActive);
      return data;
    },
    retry: false,
  });

  const { data: cycles = [], isLoading: loadingCycles } = useQuery({
    queryKey: ["cycles", "sequences-tab"],
    queryFn: async () => {
      const { data } = await api.get<Cycle[]>(ETABLISSEMENT_API.cycles);
      return data;
    },
  });

  const { data: periodes = [], isLoading: loadingPeriodes } = useQuery({
    queryKey: ["periodes", anneeActive?.id, "sequences-tab"],
    queryFn: async () => {
      const { data } = await api.get<Periode[]>(ETABLISSEMENT_API.periodes, {
        params: { annee_scolaire_id: anneeActive?.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id),
  });

  const { data: sequences = [], isLoading: loadingSequences } = useQuery({
    queryKey: ["sequences-evaluation"],
    queryFn: async () => {
      const { data } = await api.get<SequenceEvaluation[]>(
        ETABLISSEMENT_API.sequencesEvaluation,
      );
      return data;
    },
  });

  const chiffreeCycles = useMemo(
    () =>
      [...cycles]
        .filter((c) => c.type_evaluation === "chiffree")
        .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr")),
    [cycles],
  );

  const sortedPeriodes = useMemo(
    () =>
      [...periodes].sort(
        (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
      ),
    [periodes],
  );

  const grouped = useMemo((): CycleSequencesGroup[] => {
    const sequencesByCyclePeriode = new Map<string, SequenceEvaluation[]>();

    for (const seq of sequences) {
      const cycle = cycles.find((c) => c.id === seq.cycle_id);
      if (!cycle || cycle.type_evaluation !== "chiffree") continue;

      const key = accordionKey(seq.cycle_id, seq.periode_id);
      const list = sequencesByCyclePeriode.get(key) ?? [];
      list.push(seq);
      sequencesByCyclePeriode.set(key, list);
    }

    return chiffreeCycles.map((cycle) => {
      const periodeGroups = sortedPeriodes.map((periode) => {
        const key = accordionKey(cycle.id, periode.id);
        const seqList = (sequencesByCyclePeriode.get(key) ?? []).sort(
          (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
        );
        return { periode, sequences: seqList };
      });

      const sequenceCount = periodeGroups.reduce((sum, g) => sum + g.sequences.length, 0);

      return { cycle, periodes: periodeGroups, sequenceCount };
    });
  }, [sequences, cycles, chiffreeCycles, sortedPeriodes]);

  const periodesForCycle = useMemo(() => {
    if (!form.cycle_id) return [];

    const unique = new Map<string, Periode>();
    for (const periode of periodes) {
      unique.set(periode.id, periode);
    }

    return [...unique.values()].sort(
      (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
    );
  }, [form.cycle_id, periodes]);

  const selectedCycle = useMemo(
    () => cycles.find((c) => c.id === form.cycle_id),
    [cycles, form.cycle_id],
  );

  useEffect(() => {
    if (!form.periode_id || periodesForCycle.some((p) => p.id === form.periode_id)) {
      return;
    }
    setForm((prev) => ({ ...prev, periode_id: "" }));
  }, [form.cycle_id, form.periode_id, periodesForCycle]);

  const saveMutation = useMutation({
    mutationFn: async ({ payload, id }: { payload: SequenceForm; id?: string }) => {
      const body = toPayload(payload);
      if (id) {
        const { data } = await api.put<SequenceEvaluation>(
          ETABLISSEMENT_API.sequenceEvaluation(id),
          body,
        );
        return data;
      }
      const { data } = await api.post<SequenceEvaluation>(
        ETABLISSEMENT_API.sequencesEvaluation,
        body,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sequences-evaluation"] });
      toast(editTarget ? "Séquence modifiée" : "Séquence créée");
      setOpen(false);
      setEditTarget(null);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ETABLISSEMENT_API.sequenceEvaluation(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["sequences-evaluation"] });
      toast("Séquence supprimée");
      setDeleteTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const toggleAccordion = (key: string): void => {
    setExpandedAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openAddForCycle = (cycleId: string): void => {
    setEditTarget(null);
    setForm({ ...INITIAL, cycle_id: cycleId });
    setOpen(true);
  };

  const openEdit = (seq: SequenceEvaluation): void => {
    setEditTarget(seq);
    setForm({
      nom: seq.nom,
      cycle_id: seq.cycle_id,
      periode_id: seq.periode_id,
      date_debut: seq.date_debut ?? "",
      date_fin: seq.date_fin ?? "",
      ordre: String(seq.ordre),
    });
    setOpen(true);
  };

  if (loadingAnnee || loadingCycles || loadingPeriodes || loadingSequences) {
    return <LoadingSpinner />;
  }

  if (!anneeActive) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Aucune année scolaire active. Activez une année pour gérer les séquences.
      </p>
    );
  }

  if (chiffreeCycles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun cycle à évaluation chiffrée configuré.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Année active : {anneeActive.libelle}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        {grouped.map(({ cycle, periodes: periodeGroups, sequenceCount }) => (
          <Card key={cycle.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {displayCycleLabel(cycle.nom)}
                    </CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sequenceCount} séquence{sequenceCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={() => openAddForCycle(cycle.id)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Ajouter
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {sortedPeriodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucune période configurée pour cette année.
                </p>
              ) : (
                periodeGroups.map(({ periode, sequences: seqList }) => {
                  const key = accordionKey(cycle.id, periode.id);
                  const expanded = expandedAccordions[key] ?? seqList.length > 0;

                  return (
                    <div
                      key={periode.id}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <button
                        type="button"
                        onClick={() => toggleAccordion(key)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40"
                        aria-expanded={expanded}
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            expanded ? "rotate-0" : "-rotate-90",
                          )}
                        />
                        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="flex-1 font-medium">{periode.nom}</span>
                        <Badge variant="muted">{seqList.length}</Badge>
                      </button>

                      {expanded ? (
                        <div className="border-t border-border">
                          {seqList.length === 0 ? (
                            <p className="px-3 py-3 text-sm text-muted-foreground">
                              Aucune séquence pour ce trimestre.
                            </p>
                          ) : (
                            <ul className="divide-y divide-border">
                              {seqList.map((seq) => (
                                <li
                                  key={seq.id}
                                  className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <p className="font-medium">{seq.nom}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {seq.date_debut ?? "—"} → {seq.date_fin ?? "—"}
                                      {" · "}Ordre {seq.ordre}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEdit(seq)}
                                    >
                                      <Pencil className="mr-1 h-4 w-4" />
                                      Éditer
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setDeleteTarget(seq)}
                                    >
                                      <Trash2 className="mr-1 h-4 w-4" />
                                      Supprimer
                                    </Button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <FormModal
        open={open}
        title={editTarget ? "Modifier la séquence" : "Ajouter une séquence"}
        onClose={() => {
          setOpen(false);
          setEditTarget(null);
        }}
        onSubmit={() => saveMutation.mutate({ payload: form, id: editTarget?.id })}
        loading={saveMutation.isPending}
        submitLabel={editTarget ? "Enregistrer" : "Créer"}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="seq_nom">Nom</Label>
            <Input
              id="seq_nom"
              value={form.nom}
              onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
              placeholder="Composition Octobre"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq_cycle">Cycle</Label>
            <Input
              id="seq_cycle"
              value={selectedCycle ? displayCycleLabel(selectedCycle.nom) : ""}
              readOnly
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq_periode">Période parente</Label>
            <Select
              id="seq_periode"
              value={form.periode_id}
              onChange={(e) => setForm((p) => ({ ...p, periode_id: e.target.value }))}
              required
            >
              <option value="">Sélectionner une période</option>
              {periodesForCycle.map((periode) => (
                <option key={periode.id} value={periode.id}>
                  {periode.nom}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seq_debut">Date début</Label>
              <Input
                id="seq_debut"
                type="date"
                value={form.date_debut}
                onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seq_fin">Date fin</Label>
              <Input
                id="seq_fin"
                type="date"
                value={form.date_fin}
                onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="seq_ordre">Ordre</Label>
            <Input
              id="seq_ordre"
              type="number"
              min="0"
              value={form.ordre}
              onChange={(e) => setForm((p) => ({ ...p, ordre: e.target.value }))}
            />
          </div>
        </div>
      </FormModal>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <h2 className="mb-2 text-lg font-semibold">Supprimer cette séquence ?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Impossible si des notes y sont liées.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Supprimer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
