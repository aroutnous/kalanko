import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire } from "@/types";

interface AnneeForm {
  libelle: string;
  date_debut: string;
  date_fin: string;
}

const INITIAL: AnneeForm = { libelle: "", date_debut: "", date_fin: "" };

export function AnneesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AnneeForm>(INITIAL);

  const { data: annees = [], isLoading } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire[]>(ETABLISSEMENT_API.annees);
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: AnneeForm) => {
      const { data } = await api.post<AnneeScolaire>(ETABLISSEMENT_API.annees, {
        ...payload,
        est_active: false,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      toast("Année scolaire créée");
      setOpen(false);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const activerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<AnneeScolaire>(
        `${ETABLISSEMENT_API.annees}/${id}/activer`,
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      void queryClient.invalidateQueries({ queryKey: ["annee-active"] });
      toast("Année activée");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const cloturerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.put<AnneeScolaire>(`${ETABLISSEMENT_API.annees}/${id}`, {
        est_active: false,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      void queryClient.invalidateQueries({ queryKey: ["annee-active"] });
      toast("Année clôturée");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const columns: DataTableColumn<AnneeScolaire>[] = [
    { key: "libelle", header: "Libellé", render: (r) => r.libelle },
    { key: "debut", header: "Début", render: (r) => r.date_debut },
    { key: "fin", header: "Fin", render: (r) => r.date_fin },
    {
      key: "statut",
      header: "Statut",
      render: (r) => (
        <StatusBadge status={r.est_active ? "actif" : "inactif"} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        canManage ? (
          <div className="flex gap-2">
            {!r.est_active ? (
              <Button
                size="sm"
                variant="outline"
                disabled={activerMutation.isPending}
                onClick={() => activerMutation.mutate(r.id)}
              >
                Activer
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={cloturerMutation.isPending}
                onClick={() => cloturerMutation.mutate(r.id)}
              >
                Clôturer
              </Button>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Années scolaires</h2>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle année
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={annees}
        page={1}
        pageSize={annees.length || 10}
        total={annees.length}
        onPageChange={() => undefined}
        emptyMessage="Aucune année scolaire"
      />

      <FormModal
        open={open}
        title="Nouvelle année scolaire"
        onClose={() => setOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
        submitLabel="Créer"
      >
        <div className="space-y-2">
          <Label htmlFor="libelle">Libellé</Label>
          <Input
            id="libelle"
            value={form.libelle}
            onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
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
      </FormModal>
    </div>
  );
}
