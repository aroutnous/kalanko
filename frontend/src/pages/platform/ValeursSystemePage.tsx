import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getErrorMessage } from "@/lib/api";
import { PLATFORM_API } from "@/lib/platform-api";
import { cn } from "@/lib/utils";
import { useToastStore } from "@/stores/toastStore";
import type { ValeurSysteme } from "@/types";

const TAB_CATEGORIES = [
  { id: "cycle", label: "Cycles" },
  { id: "classe_predefinie", label: "Classes" },
  { id: "periode", label: "Périodes" },
  { id: "annee_scolaire", label: "Années scolaires" },
] as const;

type TabCategory = (typeof TAB_CATEGORIES)[number]["id"];

export function ValeursSystemePage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [activeTab, setActiveTab] = useState<TabCategory>("cycle");
  const [nouvelleAnnee, setNouvelleAnnee] = useState("");
  const [openAnnee, setOpenAnnee] = useState(false);

  const { data: valeurs = [], isLoading } = useQuery({
    queryKey: ["platform-valeurs-systeme", activeTab],
    queryFn: async () => {
      const { data } = await api.get<ValeurSysteme[]>(PLATFORM_API.valeursSysteme, {
        params: { categorie: activeTab },
      });
      return data;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      if (actif) {
        await api.delete(PLATFORM_API.valeurSysteme(id));
        return;
      }
      await api.put(PLATFORM_API.valeurSysteme(id), { actif: true });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-valeurs-systeme"] });
      toast("Valeur mise à jour");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const createAnneeMutation = useMutation({
    mutationFn: async (valeur: string) => {
      const { data } = await api.post<ValeurSysteme>(PLATFORM_API.valeursSysteme, {
        categorie: "annee_scolaire",
        valeur,
        metadata_json: {},
        ordre: 0,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-valeurs-systeme"] });
      toast("Année scolaire ajoutée");
      setNouvelleAnnee("");
      setOpenAnnee(false);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const columns: DataTableColumn<ValeurSysteme>[] = [
    { key: "valeur", header: "Valeur", render: (r) => r.valeur },
    {
      key: "meta",
      header: "Métadonnées",
      render: (r) =>
        r.metadata_json?.cycle ? `Cycle : ${r.metadata_json.cycle}` : "—",
    },
    { key: "ordre", header: "Ordre", render: (r) => String(r.ordre) },
    {
      key: "actif",
      header: "Statut",
      render: (r) => (r.actif ? "Actif" : "Inactif"),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <Button
          size="sm"
          variant="outline"
          disabled={toggleMutation.isPending}
          onClick={() => toggleMutation.mutate({ id: r.id, actif: r.actif })}
        >
          {r.actif ? "Désactiver" : "Activer"}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Valeurs système"
        description="Listes prédéfinies partagées par tous les établissements"
      />

      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TAB_CATEGORIES.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          {activeTab === "annee_scolaire" ? (
            <div className="mb-4">
              <Button onClick={() => setOpenAnnee(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle année
              </Button>
            </div>
          ) : null}
          <DataTable
            columns={columns}
            data={valeurs}
            page={1}
            pageSize={valeurs.length || 10}
            total={valeurs.length}
            onPageChange={() => undefined}
            emptyMessage="Aucune valeur"
          />
        </>
      )}

      <Dialog open={openAnnee} onClose={() => setOpenAnnee(false)}>
        <h2 className="mb-4 text-lg font-semibold">Nouvelle année scolaire</h2>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="valeur_annee">Libellé (ex. 2045-2046)</Label>
            <Input
              id="valeur_annee"
              value={nouvelleAnnee}
              placeholder="2045-2046"
              onChange={(e) => setNouvelleAnnee(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpenAnnee(false)}>
              Annuler
            </Button>
            <Button
              disabled={!nouvelleAnnee.trim() || createAnneeMutation.isPending}
              onClick={() => createAnneeMutation.mutate(nouvelleAnnee.trim())}
            >
              Créer
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
