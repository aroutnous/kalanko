import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { datesFromAnneeLibelle } from "@/lib/annee-utils";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, ValeurSysteme } from "@/types";

export function AnneesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [selectedValeur, setSelectedValeur] = useState("");

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
    </div>
  );
}
