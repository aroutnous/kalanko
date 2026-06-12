import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { datesFromAnneeLibelle } from "@/lib/annee-utils";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, ValeurSysteme } from "@/types";

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
  const [selectedValeur, setSelectedValeur] = useState("");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AnneeScolaire | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AnneeScolaire | null>(null);
  const [form, setForm] = useState<AnneeForm>(INITIAL);

  const { data: annees = [], isLoading } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire[]>(ETABLISSEMENT_API.annees);
      return data;
    },
  });

  const { data: valeursAnnees = [] } = useQuery({
    queryKey: ["valeurs-annees-scolaires"],
    queryFn: async () => {
      const { data } = await api.get<ValeurSysteme[]>(ETABLISSEMENT_API.valeursAnnees);
      return data;
    },
  });

  const libellesExistants = useMemo(
    () => new Set(annees.map((a) => a.libelle)),
    [annees],
  );

  const valeursDisponibles = useMemo(
    () => valeursAnnees.filter((v) => !libellesExistants.has(v.valeur)),
    [valeursAnnees, libellesExistants],
  );

  const ajouterMutation = useMutation({
    mutationFn: async (libelle: string) => {
      const { date_debut, date_fin } = datesFromAnneeLibelle(libelle);
      const { data } = await api.post<AnneeScolaire>(ETABLISSEMENT_API.annees, {
        libelle,
        date_debut,
        date_fin,
        est_active: false,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      toast("Année scolaire ajoutée");
      setSelectedValeur("");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const saveMutation = useMutation({
    mutationFn: async ({ payload, id }: { payload: AnneeForm; id: string }) => {
      const { data } = await api.put<AnneeScolaire>(`${ETABLISSEMENT_API.annees}/${id}`, {
        libelle: payload.libelle,
        date_debut: payload.date_debut,
        date_fin: payload.date_fin,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      void queryClient.invalidateQueries({ queryKey: ["annee-active"] });
      toast("Année scolaire modifiée");
      setOpen(false);
      setEditTarget(null);
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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ETABLISSEMENT_API.annees}/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["annees-scolaires"] });
      void queryClient.invalidateQueries({ queryKey: ["annee-active"] });
      toast("Année scolaire supprimée");
      setDeleteTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openEdit = (annee: AnneeScolaire): void => {
    setEditTarget(annee);
    setForm({
      libelle: annee.libelle,
      date_debut: annee.date_debut,
      date_fin: annee.date_fin,
    });
    setOpen(true);
  };

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
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
              <Pencil className="mr-1 h-4 w-4" />
              Modifier
            </Button>
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
            <Button
              size="sm"
              variant="outline"
              disabled={r.est_active}
              title={r.est_active ? "Impossible de supprimer l'année active" : undefined}
              onClick={() => setDeleteTarget(r)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
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
      </div>

      {canManage ? (
        <div className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border p-4">
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="annee_valeur">Ajouter une année</Label>
            <Select
              id="annee_valeur"
              value={selectedValeur}
              onChange={(e) => setSelectedValeur(e.target.value)}
            >
              <option value="">Sélectionner dans la liste système</option>
              {valeursDisponibles.map((v) => (
                <option key={v.id} value={v.valeur}>
                  {v.valeur}
                </option>
              ))}
            </Select>
          </div>
          <Button
            disabled={!selectedValeur || ajouterMutation.isPending}
            onClick={() => selectedValeur && ajouterMutation.mutate(selectedValeur)}
          >
            Ajouter
          </Button>
        </div>
      ) : null}

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
        title="Modifier l'année scolaire"
        onClose={() => {
          setOpen(false);
          setEditTarget(null);
          setForm(INITIAL);
        }}
        onSubmit={() => editTarget && saveMutation.mutate({ payload: form, id: editTarget.id })}
        loading={saveMutation.isPending}
        submitLabel="Enregistrer"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="annee_libelle">Libellé</Label>
            <Input
              id="annee_libelle"
              value={form.libelle}
              onChange={(e) => setForm((p) => ({ ...p, libelle: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annee_debut">Date début</Label>
            <Input
              id="annee_debut"
              type="date"
              value={form.date_debut}
              onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="annee_fin">Date fin</Label>
            <Input
              id="annee_fin"
              type="date"
              value={form.date_fin}
              onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))}
              required
            />
          </div>
        </div>
      </FormModal>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <h2 className="mb-2 text-lg font-semibold">Supprimer cette année scolaire ?</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Toutes les données associées seront perdues.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending || Boolean(deleteTarget?.est_active)}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
          >
            Supprimer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
