import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { ClasseNiveau, Matiere } from "@/types";

interface MatiereForm {
  nom: string;
  coefficient: string;
  classe_id: string;
}

const INITIAL: MatiereForm = { nom: "", coefficient: "1", classe_id: "" };

export function MatieresPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { can } = useMenuAccess();
  const canConfigure = can.etablissementConfigurer;
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Matiere | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Matiere | null>(null);
  const [form, setForm] = useState<MatiereForm>(INITIAL);

  const { data: classesNiveau = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classes-niveau"],
    queryFn: async () => {
      const { data } = await api.get<ClasseNiveau[]>(ETABLISSEMENT_API.classesNiveau);
      return data;
    },
  });

  const { data: matieres = [], isLoading: loadingMatieres } = useQuery({
    queryKey: ["matieres"],
    queryFn: async () => {
      const { data } = await api.get<Matiere[]>(ETABLISSEMENT_API.matieres);
      return data;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Matiere[]>();
    for (const classe of classesNiveau) map.set(classe.id, []);
    for (const matiere of matieres) {
      const list = map.get(matiere.classe_id) ?? [];
      list.push(matiere);
      map.set(matiere.classe_id, list);
    }
    return classesNiveau.map((classe) => ({
      classe,
      matieres: map.get(classe.id) ?? [],
    }));
  }, [classesNiveau, matieres]);

  const saveMutation = useMutation({
    mutationFn: async ({ payload, id }: { payload: MatiereForm; id?: string }) => {
      const body = {
        nom: payload.nom,
        coefficient: payload.coefficient,
      };
      if (id) {
        const { data } = await api.put<Matiere>(
          `${ETABLISSEMENT_API.matieres}/${id}`,
          body,
        );
        return data;
      }
      const { data } = await api.post<Matiere>(ETABLISSEMENT_API.matieres, {
        ...body,
        classe_id: payload.classe_id,
        est_active: true,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast(editTarget ? "Matière modifiée" : "Matière créée");
      setOpen(false);
      setEditTarget(null);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (matiere: Matiere) => {
      const { data } = await api.put<Matiere>(
        `${ETABLISSEMENT_API.matieres}/${matiere.id}`,
        { est_active: !matiere.est_active },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast(data.est_active ? "Matière activée" : "Matière désactivée");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ETABLISSEMENT_API.matieres}/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast("Matière supprimée");
      setDeleteTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openCreate = (): void => {
    setEditTarget(null);
    setForm(INITIAL);
    setOpen(true);
  };

  const openEdit = (matiere: Matiere): void => {
    setEditTarget(matiere);
    setForm({
      nom: matiere.nom,
      coefficient: String(matiere.coefficient),
      classe_id: matiere.classe_id,
    });
    setOpen(true);
  };

  if (loadingClasses || loadingMatieres) return <LoadingSpinner />;

  const formFields = (
    <>
      {!editTarget ? (
        <div className="space-y-2">
          <Label htmlFor="classe_id">Classe</Label>
          <Select
            id="classe_id"
            value={form.classe_id}
            onChange={(e) => setForm((p) => ({ ...p, classe_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner</option>
            {classesNiveau.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="nom">Nom</Label>
        <Input
          id="nom"
          value={form.nom}
          onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="coefficient">Coefficient</Label>
        <Input
          id="coefficient"
          type="number"
          min="0.1"
          step="0.1"
          value={form.coefficient}
          onChange={(e) => setForm((p) => ({ ...p, coefficient: e.target.value }))}
          required
        />
      </div>
    </>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Matières par classe</h2>
        {canConfigure ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle matière
          </Button>
        ) : null}
      </div>

      <div className="space-y-6">
        {grouped.map(({ classe, matieres: classeMatieres }) => (
          <div key={classe.id} className="rounded-lg border border-border p-4">
            <h3 className="mb-3 font-medium">{classe.nom}</h3>
            {classeMatieres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune matière</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2">Nom</th>
                      <th className="px-4 py-2">Coefficient</th>
                      <th className="px-4 py-2">Statut</th>
                      {canConfigure ? <th className="px-4 py-2">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {classeMatieres.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-2">{m.nom}</td>
                        <td className="px-4 py-2">{m.coefficient}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            status={m.est_active ? "actif" : "inactif"}
                            label={m.est_active ? "Active" : "Inactive"}
                          />
                        </td>
                        {canConfigure ? (
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(m)}
                              >
                                <Pencil className="mr-1 h-4 w-4" />
                                Modifier
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleMutation.mutate(m)}
                              >
                                {m.est_active ? "Désactiver" : "Activer"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDeleteTarget(m)}
                              >
                                <Trash2 className="mr-1 h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      <FormModal
        open={open}
        title={editTarget ? "Modifier la matière" : "Nouvelle matière"}
        onClose={() => {
          setOpen(false);
          setEditTarget(null);
        }}
        onSubmit={() => saveMutation.mutate({ payload: form, id: editTarget?.id })}
        loading={saveMutation.isPending}
        submitLabel={editTarget ? "Enregistrer" : "Créer"}
      >
        {formFields}
      </FormModal>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <h2 className="mb-2 text-lg font-semibold">Confirmer la suppression</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Supprimer {deleteTarget?.nom} ? Cette action est irréversible.
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
