import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, BookOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { MatiereFormModal } from "@/components/etablissement/MatiereFormModal";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { api, getErrorMessage } from "@/lib/api";
import { displayCycleLabel, getClasseAbbreviation } from "@/lib/etablissement-utils";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { Matiere } from "@/types";

interface MatiereGroup {
  nom: string;
  matieres: Matiere[];
}

function getGroupEnseignants(group: MatiereGroup): string[] {
  const names = new Set<string>();
  for (const matiere of group.matieres) {
    if (matiere.enseignant_principal_nom) {
      names.add(matiere.enseignant_principal_nom);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b, "fr"));
}

export function MatieresTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { can } = useMenuAccess();
  const canConfigure = can.etablissementConfigurer;

  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editNom, setEditNom] = useState<string | null>(null);
  const [deleteGroup, setDeleteGroup] = useState<MatiereGroup | null>(null);

  const { data: matieres = [], isLoading } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres);
      return data;
    },
  });

  const grouped = useMemo((): MatiereGroup[] => {
    const map = new Map<string, Matiere[]>();
    for (const matiere of matieres) {
      const list = map.get(matiere.nom) ?? [];
      list.push(matiere);
      map.set(matiere.nom, list);
    }

    return [...map.entries()]
      .map(([nom, items]) => ({
        nom,
        matieres: [...items].sort(
          (a, b) =>
            (a.cycle_nom ?? "").localeCompare(b.cycle_nom ?? "", "fr") ||
            (a.classe_nom ?? "").localeCompare(b.classe_nom ?? "", "fr"),
        ),
      }))
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [matieres]);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return grouped;
    return grouped.filter((group) => group.nom.toLowerCase().includes(query));
  }, [grouped, searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: async (group: MatiereGroup) => {
      await Promise.all(
        group.matieres.map((m) => api.delete(`${ETABLISSEMENT_API.matieres}/${m.id}`)),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast("Matière supprimée");
      setDeleteGroup(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openCreate = (): void => {
    setEditNom(null);
    setModalOpen(true);
  };

  const openEdit = (nom: string): void => {
    setEditNom(nom);
    setModalOpen(true);
  };

  const closeModal = (): void => {
    setModalOpen(false);
    setEditNom(null);
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une matière…"
            className="pl-9"
            aria-label="Rechercher une matière"
          />
        </div>
        {canConfigure ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une matière
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          {searchQuery.trim()
            ? "Aucune matière ne correspond à la recherche."
            : "Aucune matière configurée pour le moment."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((group) => {
            const first = group.matieres[0];
            const hasDomaine = group.matieres.some((m) => m.est_domaine_competence);
            const enseignants = getGroupEnseignants(group);

            return (
              <Card key={group.nom} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
                      {hasDomaine ? (
                        <Award className="h-5 w-5" aria-hidden />
                      ) : (
                        <BookOpen className="h-5 w-5" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{group.nom}</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {group.matieres.length} classe{group.matieres.length > 1 ? "s" : ""}
                        {first.est_obligatoire ? " · Obligatoire" : " · Facultative"}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto space-y-4 pt-0">
                  <div className="flex flex-wrap gap-1.5">
                    {group.matieres.map((m) => (
                      <Badge key={m.id} variant="muted" title={m.classe_nom ?? undefined}>
                        {m.cycle_nom ? `${displayCycleLabel(m.cycle_nom)} · ` : ""}
                        {m.classe_nom ? getClasseAbbreviation(m.classe_nom) : "—"}
                      </Badge>
                    ))}
                  </div>
                  {enseignants.length > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Enseignant{enseignants.length > 1 ? "s" : ""} :{" "}
                      {enseignants.join(", ")}
                    </p>
                  ) : null}
                  {canConfigure ? (
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => openEdit(group.nom)}
                      >
                        <Pencil className="mr-1 h-4 w-4" />
                        Modifier
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteGroup(group)}
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        Supprimer
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <MatiereFormModal open={modalOpen} onClose={closeModal} editNom={editNom} />

      <Dialog open={Boolean(deleteGroup)} onClose={() => setDeleteGroup(null)}>
        <h2 className="mb-2 text-lg font-semibold">Supprimer cette matière ?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Supprimer {deleteGroup?.nom} de {deleteGroup?.matieres.length ?? 0} classe
          {(deleteGroup?.matieres.length ?? 0) > 1 ? "s" : ""} ? Les notes associées seront
          conservées.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteGroup(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => deleteGroup && deleteMutation.mutate(deleteGroup)}
          >
            Supprimer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
