import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, Periode } from "@/types";

interface PeriodeForm {
  nom: string;
  date_debut: string;
  date_fin: string;
  ordre: string;
}

const INITIAL: PeriodeForm = { nom: "", date_debut: "", date_fin: "", ordre: "0" };

export function PeriodesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PeriodeForm>(INITIAL);

  const { data: anneeActive, isLoading: loadingAnnee } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>(ETABLISSEMENT_API.anneeActive);
      return data;
    },
    retry: false,
  });

  const { data: periodes = [], isLoading } = useQuery({
    queryKey: ["periodes", anneeActive?.id],
    queryFn: async () => {
      const { data } = await api.get<Periode[]>(ETABLISSEMENT_API.periodes, {
        params: { annee_scolaire_id: anneeActive?.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: PeriodeForm) => {
      if (!anneeActive) throw new Error("Aucune année active");
      const { data } = await api.post<Periode>(ETABLISSEMENT_API.periodes, {
        annee_scolaire_id: anneeActive.id,
        nom: payload.nom,
        date_debut: payload.date_debut,
        date_fin: payload.date_fin,
        ordre: Number(payload.ordre),
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["periodes"] });
      toast("Période créée");
      setOpen(false);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const columns: DataTableColumn<Periode>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "debut", header: "Début", render: (r) => r.date_debut },
    { key: "fin", header: "Fin", render: (r) => r.date_fin },
    { key: "ordre", header: "Ordre", render: (r) => r.ordre },
  ];

  if (loadingAnnee || isLoading) return <LoadingSpinner />;

  if (!anneeActive) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Aucune année scolaire active. Activez une année pour gérer les périodes.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Périodes</h2>
          <p className="text-sm text-muted-foreground">Année active : {anneeActive.libelle}</p>
        </div>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle période
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={periodes}
        page={1}
        pageSize={periodes.length || 10}
        total={periodes.length}
        onPageChange={() => undefined}
        emptyMessage="Aucune période pour cette année"
      />

      <FormModal
        open={open}
        title="Nouvelle période"
        onClose={() => setOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
      >
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
          <Label htmlFor="date_debut">Date début</Label>
          <Input
            id="date_debut"
            type="date"
            value={form.date_debut}
            onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_fin">Date fin</Label>
          <Input
            id="date_fin"
            type="date"
            value={form.date_fin}
            onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))}
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
