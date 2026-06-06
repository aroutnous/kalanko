import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, Classe, ClasseEffectif, Niveau } from "@/types";

interface ClasseForm {
  nom: string;
  niveau_id: string;
  annee_scolaire_id: string;
  capacite_max: string;
}

interface ClasseRow extends Classe {
  niveau_nom: string;
  annee_libelle: string;
  effectif: number;
  est_complete: boolean;
}

const INITIAL: ClasseForm = {
  nom: "",
  niveau_id: "",
  annee_scolaire_id: "",
  capacite_max: "",
};

export function ClassesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClasseForm>(INITIAL);

  const { data: annees = [] } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire[]>(ETABLISSEMENT_API.annees);
      return data;
    },
  });

  const { data: niveaux = [] } = useQuery({
    queryKey: ["niveaux"],
    queryFn: async () => {
      const { data } = await api.get<Niveau[]>(ETABLISSEMENT_API.niveaux);
      return data;
    },
  });

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get<Classe[]>(ETABLISSEMENT_API.classes);
      return data;
    },
  });

  const effectifQueries = useQueries({
    queries: classes.map((classe) => ({
      queryKey: ["classe-effectif", classe.id],
      queryFn: async () => {
        const { data } = await api.get<ClasseEffectif>(
          `${ETABLISSEMENT_API.classes}/${classe.id}/effectif`,
        );
        return data;
      },
    })),
  });

  const rows: ClasseRow[] = useMemo(() => {
    const niveauMap = new Map(niveaux.map((n) => [n.id, n.nom]));
    const anneeMap = new Map(annees.map((a) => [a.id, a.libelle]));
    return classes.map((classe, index) => {
      const eff = effectifQueries[index]?.data;
      return {
        ...classe,
        niveau_nom: niveauMap.get(classe.niveau_id) ?? "—",
        annee_libelle: anneeMap.get(classe.annee_scolaire_id) ?? "—",
        effectif: eff?.effectif ?? 0,
        est_complete: eff?.est_complete ?? false,
      };
    });
  }, [classes, niveaux, annees, effectifQueries]);

  const createMutation = useMutation({
    mutationFn: async (payload: ClasseForm) => {
      const body: Record<string, string | number> = {
        nom: payload.nom,
        niveau_id: payload.niveau_id,
        annee_scolaire_id: payload.annee_scolaire_id,
      };
      if (payload.capacite_max) body.capacite_max = Number(payload.capacite_max);
      const { data } = await api.post<Classe>(ETABLISSEMENT_API.classes, body);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast("Classe créée");
      setOpen(false);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const columns: DataTableColumn<ClasseRow>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "niveau", header: "Niveau", render: (r) => r.niveau_nom },
    { key: "annee", header: "Année", render: (r) => r.annee_libelle },
    {
      key: "capacite",
      header: "Capacité",
      render: (r) => (r.capacite_max != null ? String(r.capacite_max) : "∞"),
    },
    {
      key: "effectif",
      header: "Effectif",
      render: (r) => (
        <span className={r.est_complete ? "font-medium text-destructive" : ""}>
          {r.effectif}
          {r.est_complete ? " (complète)" : ""}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (r) =>
        r.est_complete ? <StatusBadge status="complete" /> : <StatusBadge status="actif" label="Disponible" />,
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Classes</h2>
        {canManage ? (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle classe
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        page={1}
        pageSize={rows.length || 10}
        total={rows.length}
        onPageChange={() => undefined}
      />

      <FormModal
        open={open}
        title="Nouvelle classe"
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
          <Label htmlFor="annee_scolaire_id">Année scolaire</Label>
          <Select
            id="annee_scolaire_id"
            value={form.annee_scolaire_id}
            onChange={(e) => setForm((p) => ({ ...p, annee_scolaire_id: e.target.value }))}
            required
          >
            <option value="">Sélectionner</option>
            {annees.map((a) => (
              <option key={a.id} value={a.id}>
                {a.libelle}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacite_max">Capacité max</Label>
          <Input
            id="capacite_max"
            type="number"
            min="1"
            value={form.capacite_max}
            onChange={(e) => setForm((p) => ({ ...p, capacite_max: e.target.value }))}
          />
        </div>
      </FormModal>
    </div>
  );
}
