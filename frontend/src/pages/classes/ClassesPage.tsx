import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type {
  ClasseNiveau,
  Cycle,
  EtablissementStructure,
  ValeurSysteme,
} from "@/types";

interface ClasseRow {
  id: string;
  nom: string;
  cycle_nom: string;
  nb_salles: number;
  statut: "actif" | "inactif";
}

interface ClasseForm {
  cycle_id: string;
  valeur_systeme_ref: string;
}

const INITIAL: ClasseForm = { cycle_id: "", valeur_systeme_ref: "" };

export function ClassesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClasseForm>(INITIAL);
  const [cycleFilter, setCycleFilter] = useState("");

  const { data: structure, isLoading } = useQuery({
    queryKey: ["etablissement-structure"],
    queryFn: async () => {
      const { data } = await api.get<EtablissementStructure>(ETABLISSEMENT_API.structure);
      return data;
    },
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const { data } = await api.get<Cycle[]>(ETABLISSEMENT_API.cycles);
      return data;
    },
  });

  const selectedCycleNom = useMemo(
    () => cycles.find((c) => c.id === form.cycle_id)?.nom ?? "",
    [cycles, form.cycle_id],
  );

  const { data: valeursClasses = [] } = useQuery({
    queryKey: ["valeurs-classes", selectedCycleNom],
    queryFn: async () => {
      const { data } = await api.get<ValeurSysteme[]>(ETABLISSEMENT_API.valeursClasses, {
        params: { cycle: selectedCycleNom },
      });
      return data;
    },
    enabled: Boolean(selectedCycleNom),
  });

  const rows: ClasseRow[] = useMemo(() => {
    if (!structure) return [];
    const list: ClasseRow[] = [];
    for (const cycle of structure.cycles) {
      for (const classe of cycle.classes) {
        list.push({
          id: classe.id,
          nom: classe.nom,
          cycle_nom: cycle.nom,
          nb_salles: classe.salles.length,
          statut: classe.salles.length > 0 ? "actif" : "inactif",
        });
      }
    }
    return list.filter((r) => !cycleFilter || r.cycle_nom === cycleFilter);
  }, [structure, cycleFilter]);

  const createMutation = useMutation({
    mutationFn: async (payload: ClasseForm) => {
      const valeur = valeursClasses.find((v) => v.valeur === payload.valeur_systeme_ref);
      const { data } = await api.post<ClasseNiveau>(ETABLISSEMENT_API.classesNiveau, {
        cycle_id: payload.cycle_id,
        nom: payload.valeur_systeme_ref,
        ordre: valeur?.ordre ?? 0,
        valeur_systeme_ref: payload.valeur_systeme_ref,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["etablissement-structure"] });
      void queryClient.invalidateQueries({ queryKey: ["classes-niveau"] });
      toast("Classe créée");
      setOpen(false);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const columns: DataTableColumn<ClasseRow>[] = [
    { key: "nom", header: "Classe", render: (r) => r.nom },
    { key: "cycle", header: "Cycle", render: (r) => r.cycle_nom },
    { key: "salles", header: "Salles", render: (r) => String(r.nb_salles) },
    {
      key: "statut",
      header: "Statut",
      render: (r) => (
        <StatusBadge
          status={r.statut === "actif" ? "actif" : "inactif"}
          label={r.statut === "actif" ? "Configurée" : "Sans salle"}
        />
      ),
    },
  ];

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Niveaux scolaires de l'établissement (ex. 1ère Année, CM2…)"
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select
          value={cycleFilter}
          onChange={(e) => setCycleFilter(e.target.value)}
          className="w-48"
        >
          <option value="">Tous les cycles</option>
          {cycles.map((c) => (
            <option key={c.id} value={c.nom}>
              {c.nom}
            </option>
          ))}
        </Select>
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
        emptyMessage="Aucune classe configurée"
      />

      <FormModal
        open={open}
        title="Nouvelle classe"
        onClose={() => setOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
      >
        <div className="space-y-2">
          <Label htmlFor="cycle_id">Cycle</Label>
          <Select
            id="cycle_id"
            value={form.cycle_id}
            onChange={(e) =>
              setForm({ cycle_id: e.target.value, valeur_systeme_ref: "" })
            }
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
          <Label htmlFor="valeur">Classe prédéfinie</Label>
          <Select
            id="valeur"
            value={form.valeur_systeme_ref}
            onChange={(e) =>
              setForm((p) => ({ ...p, valeur_systeme_ref: e.target.value }))
            }
            required
            disabled={!form.cycle_id}
          >
            <option value="">Sélectionner</option>
            {valeursClasses.map((v) => (
              <option key={v.id} value={v.valeur}>
                {v.valeur}
              </option>
            ))}
          </Select>
        </div>
      </FormModal>
    </div>
  );
}
