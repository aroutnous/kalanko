import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMenuAccess } from "@/hooks/useMenuAccess";
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
  const { can } = useMenuAccess();
  const canConfigure = can.etablissementConfigurer;
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Periode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Periode | null>(null);
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

  const saveMutation = useMutation({
    mutationFn: async ({ payload, id }: { payload: PeriodeForm; id?: string }) => {
      const body = {
        nom: payload.nom,
        date_debut: payload.date_debut,
        date_fin: payload.date_fin,
        ordre: Number(payload.ordre),
      };
      if (id) {
        const { data } = await api.put<Periode>(
          `${ETABLISSEMENT_API.periodes}/${id}`,
          body,
        );
        return data;
      }
      if (!anneeActive) throw new Error("Aucune année active");
      const { data } = await api.post<Periode>(ETABLISSEMENT_API.periodes, {
        ...body,
        annee_scolaire_id: anneeActive.id,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["periodes"] });
      toast(editTarget ? "Période modifiée" : "Période créée");
      setOpen(false);
      setEditTarget(null);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ETABLISSEMENT_API.periodes}/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["periodes"] });
      toast("Période supprimée");
      setDeleteTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openEdit = (periode: Periode): void => {
    setEditTarget(periode);
    setForm({
      nom: periode.nom,
      date_debut: periode.date_debut,
      date_fin: periode.date_fin,
      ordre: String(periode.ordre),
    });
    setOpen(true);
  };

  const columns: DataTableColumn<Periode>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "debut", header: "Début", render: (r) => r.date_debut },
    { key: "fin", header: "Fin", render: (r) => r.date_fin },
    { key: "ordre", header: "Ordre", render: (r) => r.ordre },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        canConfigure ? (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
              <Pencil className="mr-1 h-4 w-4" />
              Modifier
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDeleteTarget(r)}>
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>
        ) : (
          "—"
        ),
    },
  ];

  if (loadingAnnee || isLoading) return <LoadingSpinner />;

  if (!anneeActive) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Aucune année scolaire active. Activez une année pour gérer les périodes.
      </p>
    );
  }

  const formFields = (
    <>
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
    </>
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Périodes</h2>
          <p className="text-sm text-muted-foreground">Année active : {anneeActive.libelle}</p>
        </div>
        {canConfigure ? (
          <Button
            onClick={() => {
              setEditTarget(null);
              setForm(INITIAL);
              setOpen(true);
            }}
          >
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
        title={editTarget ? "Modifier la période" : "Nouvelle période"}
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
