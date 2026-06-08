import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  NotesGrid,
  cellKey,
  type NotesGridState,
} from "@/components/pedagogie/NotesGrid";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { usePedagogieAccess } from "@/hooks/usePedagogieAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { ELEVES_API } from "@/lib/eleves-api";
import { PEDAGOGIE_API } from "@/lib/pedagogie-api";
import { useToastStore } from "@/stores/toastStore";
import type {
  Classe,
  ConfigNotation,
  Eleve,
  Matiere,
  Niveau,
  Note,
  NoteCreatePayload,
  Periode,
} from "@/types";

export function SaisieNotesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canSaveNotes } = usePedagogieAccess();
  const [classeId, setClasseId] = useState("");
  const [periodeId, setPeriodeId] = useState("");
  const [grid, setGrid] = useState<NotesGridState>({});

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get<Classe[]>(ETABLISSEMENT_API.classes);
      return data;
    },
  });

  const { data: periodes = [] } = useQuery({
    queryKey: ["periodes"],
    queryFn: async () => {
      const { data } = await api.get<Periode[]>(ETABLISSEMENT_API.periodes);
      return data;
    },
  });

  const { data: niveaux = [] } = useQuery({
    queryKey: ["niveaux"],
    queryFn: async () => {
      const { data } = await api.get<Niveau[]>(ETABLISSEMENT_API.niveaux);
      return data;
    },
  });

  const { data: matieresAll = [] } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres);
      return data;
    },
  });

  const { data: configNotation } = useQuery({
    queryKey: ["config-notation"],
    queryFn: async () => {
      const { data } = await api.get<ConfigNotation>(ETABLISSEMENT_API.configNotation);
      return data;
    },
  });

  const selectedClasse = classes.find((c) => c.id === classeId);

  const matieres = useMemo(() => {
    if (!selectedClasse) return [];
    return matieresAll.filter(
      (m) => m.niveau_id === selectedClasse.niveau_id && m.est_active,
    );
  }, [matieresAll, selectedClasse]);

  const { data: eleves = [], isLoading: loadingEleves } = useQuery({
    queryKey: ["eleves", "", classeId, ""],
    queryFn: async () => {
      const { data } = await api.get<Eleve[]>(ELEVES_API.list, {
        params: { classe_id: classeId },
      });
      return data;
    },
    enabled: Boolean(classeId),
  });

  const noteQueries = useQueries({
    queries: eleves.map((eleve) => ({
      queryKey: ["notes-eleve", eleve.id, periodeId],
      queryFn: async () => {
        const params: Record<string, string> = {};
        if (periodeId) params.periode_id = periodeId;
        const { data } = await api.get<Note[]>(
          PEDAGOGIE_API.notesHistorique(eleve.id),
          { params },
        );
        return data;
      },
      enabled: Boolean(classeId && periodeId),
      staleTime: 30_000,
    })),
  });

  const loadingNotes = noteQueries.some((q) => q.isLoading);

  const eleveIdsKey = eleves.map((e) => e.id).join(",");
  const matiereIdsKey = matieres.map((m) => m.id).join(",");
  const notesQueryKey = noteQueries
    .map((q) => `${q.dataUpdatedAt ?? 0}:${q.status}`)
    .join("|");

  useEffect(() => {
    if (!classeId || !periodeId) {
      setGrid((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (eleves.length === 0) {
      setGrid((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    if (noteQueries.some((q) => q.isLoading)) {
      return;
    }

    const next: NotesGridState = {};
    eleves.forEach((eleve, index) => {
      const notes = noteQueries[index]?.data ?? [];
      matieres.forEach((matiere) => {
        const existing = notes.find(
          (n) => n.matiere_id === matiere.id && n.periode_id === periodeId,
        );
        const key = cellKey(eleve.id, matiere.id);
        next[key] = {
          valeur: existing ? String(existing.valeur) : "",
          appreciation: existing?.appreciation ?? "",
          noteId: existing?.id,
        };
      });
    });
    setGrid(next);
  }, [classeId, periodeId, eleveIdsKey, matiereIdsKey, notesQueryKey]);

  const saveMutation = useMutation({
    mutationFn: async (notes: NoteCreatePayload[]) => {
      const { data } = await api.post<Note[]>(PEDAGOGIE_API.notesBatch, { notes });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notes-eleve"] });
      toast("Notes enregistrées");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const handleChange = (
    key: string,
    field: keyof NotesGridState[string],
    value: string,
  ): void => {
    setGrid((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleSave = (): void => {
    if (!classeId || !periodeId) {
      toast("Sélectionnez une classe et une période", "error");
      return;
    }
    const notes: NoteCreatePayload[] = [];
    for (const eleve of eleves) {
      for (const matiere of matieres) {
        const key = cellKey(eleve.id, matiere.id);
        const cell = grid[key];
        if (!cell?.valeur) continue;
        const valeur = Number(cell.valeur);
        if (Number.isNaN(valeur) || valeur < 0 || valeur > 20) {
          toast(`Note invalide pour ${eleve.nom} — ${matiere.nom}`, "error");
          return;
        }
        notes.push({
          eleve_id: eleve.id,
          matiere_id: matiere.id,
          periode_id: periodeId,
          classe_id: classeId,
          valeur,
          appreciation: cell.appreciation || undefined,
        });
      }
    }
    if (notes.length === 0) {
      toast("Aucune note à enregistrer", "error");
      return;
    }
    saveMutation.mutate(notes);
  };

  const notePassage = configNotation?.note_passage ?? 10;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saisie des notes"
        description="Grille de saisie par classe et période"
        breadcrumb="Pédagogie"
        action={
          canSaveNotes ? (
            <Button
              disabled={!classeId || !periodeId || saveMutation.isPending}
              onClick={handleSave}
            >
              <Save className="mr-2 h-4 w-4" />
              {saveMutation.isPending ? "Enregistrement…" : "Enregistrer tout"}
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          className="max-w-[220px]"
        >
          <option value="">Sélectionner une classe</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Select>
        <Select
          value={periodeId}
          onChange={(e) => setPeriodeId(e.target.value)}
          className="max-w-[220px]"
          disabled={!classeId}
        >
          <option value="">Sélectionner une période</option>
          {periodes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nom}
            </option>
          ))}
        </Select>
      </div>

      {classeId && selectedClasse ? (
        <p className="text-sm text-muted-foreground">
          Niveau : {niveaux.find((n) => n.id === selectedClasse.niveau_id)?.nom ?? "—"}
          {" · "}
          Note de passage : <strong>{notePassage}</strong>
          {" · "}
          Notes en rouge = sous le seuil
        </p>
      ) : null}

      {!classeId || !periodeId ? (
        <p className="text-sm text-muted-foreground">
          Sélectionnez une classe et une période pour afficher la grille.
        </p>
      ) : loadingEleves || loadingNotes ? (
        <LoadingSpinner />
      ) : (
        <NotesGrid
          eleves={eleves}
          matieres={matieres}
          values={grid}
          notePassage={notePassage}
          readOnly={!canSaveNotes}
          onChange={handleChange}
        />
      )}
    </div>
  );
}
