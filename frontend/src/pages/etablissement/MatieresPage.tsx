import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { Matiere, Niveau } from "@/types";

interface MatiereForm {
  nom: string;
  coefficient: string;
  niveau_id: string;
}

const INITIAL: MatiereForm = { nom: "", coefficient: "1", niveau_id: "" };

export function MatieresPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<MatiereForm>(INITIAL);

  const { data: niveaux = [], isLoading: loadingNiveaux } = useQuery({
    queryKey: ["niveaux"],
    queryFn: async () => {
      const { data } = await api.get<Niveau[]>(ETABLISSEMENT_API.niveaux);
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
    for (const niveau of niveaux) map.set(niveau.id, []);
    for (const matiere of matieres) {
      const list = map.get(matiere.niveau_id) ?? [];
      list.push(matiere);
      map.set(matiere.niveau_id, list);
    }
    return niveaux.map((niveau) => ({
      niveau,
      matieres: map.get(niveau.id) ?? [],
    }));
  }, [niveaux, matieres]);

  const createMutation = useMutation({
    mutationFn: async (payload: MatiereForm) => {
      const { data } = await api.post<Matiere>(ETABLISSEMENT_API.matieres, {
        nom: payload.nom,
        coefficient: payload.coefficient,
        niveau_id: payload.niveau_id,
        est_active: true,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast("Matière créée");
      setOpen(false);
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
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (loadingNiveaux || loadingMatieres) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Matières par niveau</h2>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle matière
          </Button>
        ) : null}
      </div>

      <div className="space-y-6">
        {grouped.map(({ niveau, matieres: niveauMatieres }) => (
          <div key={niveau.id} className="rounded-lg border border-border p-4">
            <h3 className="mb-3 font-medium">{niveau.nom}</h3>
            {niveauMatieres.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune matière</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2">Nom</th>
                      <th className="px-4 py-2">Coefficient</th>
                      <th className="px-4 py-2">Statut</th>
                      {canManage ? <th className="px-4 py-2">Actions</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {niveauMatieres.map((m) => (
                      <tr key={m.id} className="border-t border-border">
                        <td className="px-4 py-2">{m.nom}</td>
                        <td className="px-4 py-2">{m.coefficient}</td>
                        <td className="px-4 py-2">
                          <StatusBadge
                            status={m.est_active ? "actif" : "inactif"}
                            label={m.est_active ? "Active" : "Inactive"}
                          />
                        </td>
                        {canManage ? (
                          <td className="px-4 py-2">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleMutation.mutate(m)}
                              >
                                {m.est_active ? "Désactiver" : "Activer"}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteMutation.mutate(m.id)}
                              >
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
        title="Nouvelle matière"
        onClose={() => setOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="niveau_id">Niveau</Label>
          <Select
            id="niveau_id"
            value={form.niveau_id}
            onChange={(e) => setForm((p) => ({ ...p, niveau_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner</option>
            {niveaux.map((n) => (
              <option key={n.id} value={n.id}>
                {n.nom}
              </option>
            ))}
          </Select>
        </div>
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
      </FormModal>
    </div>
  );
}
