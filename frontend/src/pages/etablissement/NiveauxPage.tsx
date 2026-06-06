import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { Cycle, Niveau } from "@/types";

interface NiveauForm {
  nom: string;
  ordre: string;
  cycle_id: string;
}

const INITIAL: NiveauForm = { nom: "", ordre: "0", cycle_id: "" };

export function NiveauxPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NiveauForm>(INITIAL);

  const { data: cycles = [], isLoading: loadingCycles } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const { data } = await api.get<Cycle[]>(ETABLISSEMENT_API.cycles);
      return data;
    },
  });

  const { data: niveaux = [], isLoading: loadingNiveaux } = useQuery({
    queryKey: ["niveaux"],
    queryFn: async () => {
      const { data } = await api.get<Niveau[]>(ETABLISSEMENT_API.niveaux);
      return data;
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Niveau[]>();
    for (const cycle of cycles) map.set(cycle.id, []);
    for (const niveau of niveaux) {
      const list = map.get(niveau.cycle_id) ?? [];
      list.push(niveau);
      map.set(niveau.cycle_id, list);
    }
    return cycles.map((cycle) => ({
      cycle,
      niveaux: (map.get(cycle.id) ?? []).sort((a, b) => a.ordre - b.ordre),
    }));
  }, [cycles, niveaux]);

  const createMutation = useMutation({
    mutationFn: async (payload: NiveauForm) => {
      const { data } = await api.post<Niveau>(ETABLISSEMENT_API.niveaux, {
        nom: payload.nom,
        ordre: Number(payload.ordre),
        cycle_id: payload.cycle_id,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["niveaux"] });
      toast("Niveau créé");
      setOpen(false);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (loadingCycles || loadingNiveaux) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Niveaux par cycle</h2>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau niveau
          </Button>
        ) : null}
      </div>

      <div className="space-y-6">
        {grouped.map(({ cycle, niveaux: cycleNiveaux }) => (
          <div key={cycle.id} className="rounded-lg border border-border p-4">
            <h3 className="mb-3 font-medium">{cycle.nom}</h3>
            {cycleNiveaux.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun niveau</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {cycleNiveaux.map((n) => (
                  <li key={n.id} className="flex justify-between rounded bg-muted/40 px-3 py-2">
                    <span>{n.nom}</span>
                    <span className="text-muted-foreground">Ordre {n.ordre}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <FormModal
        open={open}
        title="Nouveau niveau"
        onClose={() => setOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="cycle_id">Cycle</Label>
          <Select
            id="cycle_id"
            value={form.cycle_id}
            onChange={(e) => setForm((p) => ({ ...p, cycle_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom}
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
          <Label htmlFor="ordre">Ordre</Label>
          <Input
            id="ordre"
            type="number"
            min="0"
            value={form.ordre}
            onChange={(e) => setForm((p) => ({ ...p, ordre: e.target.value }))}
          />
        </div>
      </FormModal>
    </div>
  );
}
