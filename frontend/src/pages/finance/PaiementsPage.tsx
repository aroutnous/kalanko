import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import type { AnneeScolaire, Eleve, FraisScolaire, ModePaiement, Paiement } from "@/types";

interface PaiementForm {
  eleve_id: string;
  frais_id: string;
  montant_paye: string;
  mode_paiement: ModePaiement;
}

const MODES: { value: ModePaiement; label: string }[] = [
  { value: "especes", label: "Espèces" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
];

export function PaiementsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<PaiementForm>({
    eleve_id: "",
    frais_id: "",
    montant_paye: "",
    mode_paiement: "especes",
  });
  const [error, setError] = useState<string | null>(null);
  const { data: eleves = [], isLoading: loadingEleves } = useQuery({
    queryKey: ["eleves-paiements"],
    queryFn: async () => {
      const { data } = await api.get<Eleve[]>("/eleves/");
      return data;
    },
  });

  const { data: anneeActive, isLoading: loadingAnnee } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>("/annees-scolaires/active");
      return data;
    },
  });

  const { data: frais = [], isLoading: loadingFrais } = useQuery({
    queryKey: ["frais", anneeActive?.id],
    queryFn: async () => {
      const { data } = await api.get<FraisScolaire[]>("/finance/frais", {
        params: { annee_id: anneeActive?.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id),
  });

  const { data: todayPayments = [], isLoading: loadingPaiements } = useQuery({
    queryKey: ["paiements-jour"],
    queryFn: async () => {
      const { data } = await api.get<Paiement[]>("/finance/paiements");
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!anneeActive) throw new Error("Aucune année scolaire active");
      const { data } = await api.post<Paiement>("/finance/paiements", {
        eleve_id: form.eleve_id,
        frais_id: form.frais_id,
        annee_scolaire_id: anneeActive.id,
        montant_paye: form.montant_paye,
        mode_paiement: form.mode_paiement,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["paiements-jour"] });
      setForm((prev) => ({ ...prev, montant_paye: "" }));
      setError(null);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const columns: DataTableColumn<Paiement>[] = [
    { key: "ref", header: "Référence", render: (r) => r.reference_transaction ?? "—" },
    { key: "eleve", header: "Élève", render: (r) => r.eleve_id.slice(0, 8) + "…" },
    { key: "montant", header: "Montant", render: (r) => `${r.montant_paye} FCFA` },
    { key: "mode", header: "Mode", render: (r) => r.mode_paiement },
    { key: "statut", header: "Statut", render: (r) => r.statut },
  ];

  if (loadingEleves || loadingAnnee || loadingFrais || loadingPaiements) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paiements"
        description="Enregistrement des paiements scolaires"
        breadcrumb="Finance"
      />

      <Card>
        <CardHeader>
          <CardTitle>Nouveau paiement</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="space-y-2">
              <Label>Élève *</Label>
              <Select
                value={form.eleve_id}
                onChange={(e) => setForm((p) => ({ ...p, eleve_id: e.target.value }))}
                required
              >
                <option value="">Sélectionner</option>
                {eleves.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nom} {e.prenom} ({e.matricule})
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frais *</Label>
              <Select
                value={form.frais_id}
                onChange={(e) => setForm((p) => ({ ...p, frais_id: e.target.value }))}
                required
              >
                <option value="">Sélectionner</option>
                {frais.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.libelle} — {f.montant} FCFA
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Montant (FCFA) *</Label>
              <Input
                type="number"
                min="1"
                value={form.montant_paye}
                onChange={(e) => setForm((p) => ({ ...p, montant_paye: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Mode *</Label>
              <Select
                value={form.mode_paiement}
                onChange={(e) =>
                  setForm((p) => ({ ...p, mode_paiement: e.target.value as ModePaiement }))
                }
              >
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            {error ? (
              <p className="text-sm text-destructive sm:col-span-2 lg:col-span-4" role="alert">
                {error}
              </p>
            ) : null}
            <div className="sm:col-span-2 lg:col-span-4">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Enregistrement…" : "Enregistrer le paiement"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Paiements du jour</h2>
        <DataTable
          columns={columns}
          data={todayPayments}
          page={1}
          pageSize={10}
          total={todayPayments.length}
          onPageChange={() => undefined}
          emptyMessage="Aucun paiement enregistré aujourd'hui"
        />
      </div>
    </div>
  );
}
