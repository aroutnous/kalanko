import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, Pencil, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { StatusBadge } from "@/components/etablissement/StatusBadge";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ENSEIGNANTS_API } from "@/lib/enseignants-api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, Classe, ClasseEffectif, Enseignant, Niveau } from "@/types";

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
  enseignants_count: number;
  enseignants_noms: string;
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
  const { can } = useMenuAccess();
  const hasPermission = useHasPermission();
  const canManage = can.classesGerer;
  const canRead =
    hasPermission("classes.consulter") || canManage;

  const [niveauFilter, setNiveauFilter] = useState("");
  const [anneeFilter, setAnneeFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Classe | null>(null);
  const [form, setForm] = useState<ClasseForm>(INITIAL);
  const [enseignantsClasseId, setEnseignantsClasseId] = useState<string | null>(null);

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
    enabled: canRead,
  });

  const filteredClasses = useMemo(
    () =>
      classes.filter((c) => {
        if (niveauFilter && c.niveau_id !== niveauFilter) return false;
        if (anneeFilter && c.annee_scolaire_id !== anneeFilter) return false;
        return true;
      }),
    [classes, niveauFilter, anneeFilter],
  );

  const effectifQueries = useQueries({
    queries: filteredClasses.map((classe) => ({
      queryKey: ["classe-effectif", classe.id],
      queryFn: async () => {
        const { data } = await api.get<ClasseEffectif>(
          `${ETABLISSEMENT_API.classes}/${classe.id}/effectif`,
        );
        return data;
      },
    })),
  });

  const enseignantQueries = useQueries({
    queries: filteredClasses.map((classe) => ({
      queryKey: ["enseignants-classe", classe.id],
      queryFn: async () => {
        const { data } = await api.get<Enseignant[]>(
          ENSEIGNANTS_API.parClasse(classe.id),
        );
        return data;
      },
    })),
  });

  const { data: enseignantsListe = [], isLoading: loadingEnseignants } = useQuery({
    queryKey: ["enseignants-classe-modal", enseignantsClasseId],
    queryFn: async () => {
      const { data } = await api.get<Enseignant[]>(
        ENSEIGNANTS_API.parClasse(enseignantsClasseId!),
      );
      return data;
    },
    enabled: Boolean(enseignantsClasseId),
  });

  const rows: ClasseRow[] = useMemo(() => {
    const niveauMap = new Map(niveaux.map((n) => [n.id, n.nom]));
    const anneeMap = new Map(annees.map((a) => [a.id, a.libelle]));
    return filteredClasses.map((classe, index) => {
      const eff = effectifQueries[index]?.data;
      const ens = enseignantQueries[index]?.data ?? [];
      return {
        ...classe,
        niveau_nom: niveauMap.get(classe.niveau_id) ?? "—",
        annee_libelle: anneeMap.get(classe.annee_scolaire_id) ?? "—",
        effectif: eff?.effectif ?? 0,
        est_complete: eff?.est_complete ?? false,
        enseignants_count: ens.length,
        enseignants_noms: ens.map((e) => `${e.prenom} ${e.nom}`).join(", ") || "—",
      };
    });
  }, [filteredClasses, niveaux, annees, effectifQueries, enseignantQueries]);

  const saveMutation = useMutation({
    mutationFn: async ({
      payload,
      id,
    }: {
      payload: ClasseForm;
      id?: string;
    }) => {
      const body: Record<string, string | number> = {
        nom: payload.nom,
        niveau_id: payload.niveau_id,
        annee_scolaire_id: payload.annee_scolaire_id,
      };
      if (payload.capacite_max) body.capacite_max = Number(payload.capacite_max);
      if (id) {
        const { data } = await api.put<Classe>(
          `${ETABLISSEMENT_API.classes}/${id}`,
          body,
        );
        return data;
      }
      const { data } = await api.post<Classe>(ETABLISSEMENT_API.classes, body);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast(editTarget ? "Classe modifiée" : "Classe créée");
      setOpen(false);
      setEditTarget(null);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openEdit = (classe: Classe): void => {
    setEditTarget(classe);
    setForm({
      nom: classe.nom,
      niveau_id: classe.niveau_id,
      annee_scolaire_id: classe.annee_scolaire_id,
      capacite_max: classe.capacite_max != null ? String(classe.capacite_max) : "",
    });
  };

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
          onChange={(e) =>
            setForm((p) => ({ ...p, annee_scolaire_id: e.target.value }))
          }
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
    </>
  );

  const columns: DataTableColumn<ClasseRow>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "niveau", header: "Niveau", render: (r) => r.niveau_nom },
    { key: "annee", header: "Année scolaire", render: (r) => r.annee_libelle },
    {
      key: "capacite",
      header: "Capacité max",
      render: (r) => (r.capacite_max != null ? String(r.capacite_max) : "∞"),
    },
    {
      key: "effectif",
      header: "Effectif",
      render: (r) => (
        <span className={r.est_complete ? "font-medium text-destructive" : ""}>
          {r.effectif}
        </span>
      ),
    },
    {
      key: "enseignants",
      header: "Enseignants",
      render: (r) => (
        <span title={r.enseignants_noms}>
          {r.enseignants_count > 0 ? r.enseignants_noms : "—"}
        </span>
      ),
    },
    {
      key: "statut",
      header: "Statut",
      render: (r) =>
        r.est_complete ? (
          <StatusBadge status="complete" />
        ) : (
          <StatusBadge status="actif" label="Disponible" />
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEnseignantsClasseId(r.id)}
            title="Voir enseignants"
          >
            <Eye className="h-4 w-4" />
          </Button>
          {canManage ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => openEdit(r)}
              title="Modifier"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  if (!canRead) {
    return (
      <p className="text-sm text-muted-foreground">
        Vous n&apos;avez pas accès à cette section.
      </p>
    );
  }

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <PageHeader
        title="Classes"
        description="Vue d'ensemble des classes et affectations enseignants"
        action={
          canManage ? (
            <Button
              onClick={() => {
                setForm(INITIAL);
                setOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle classe
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 flex flex-wrap gap-4">
        <Select
          value={niveauFilter}
          onChange={(e) => setNiveauFilter(e.target.value)}
          className="max-w-xs"
          aria-label="Filtrer par niveau"
        >
          <option value="">Tous les niveaux</option>
          {niveaux.map((n) => (
            <option key={n.id} value={n.id}>
              {n.nom}
            </option>
          ))}
        </Select>
        <Select
          value={anneeFilter}
          onChange={(e) => setAnneeFilter(e.target.value)}
          className="max-w-xs"
          aria-label="Filtrer par année"
        >
          <option value="">Toutes les années</option>
          {annees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.libelle}
            </option>
          ))}
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        page={1}
        pageSize={rows.length || 10}
        total={rows.length}
        onPageChange={() => undefined}
        emptyMessage="Aucune classe"
      />

      <FormModal
        open={open}
        title="Nouvelle classe"
        onClose={() => setOpen(false)}
        onSubmit={() => saveMutation.mutate({ payload: form })}
        loading={saveMutation.isPending}
      >
        {formFields}
      </FormModal>

      <FormModal
        open={editTarget !== null}
        title="Modifier la classe"
        onClose={() => setEditTarget(null)}
        onSubmit={() => {
          if (editTarget) saveMutation.mutate({ payload: form, id: editTarget.id });
        }}
        loading={saveMutation.isPending}
      >
        {formFields}
      </FormModal>

      <Dialog
        open={enseignantsClasseId !== null}
        onClose={() => setEnseignantsClasseId(null)}
      >
        <h2 className="mb-4 pr-8 text-lg font-semibold">Enseignants de la classe</h2>
        {loadingEnseignants ? (
          <LoadingSpinner label="Chargement…" />
        ) : enseignantsListe.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun enseignant affecté.</p>
        ) : (
          <ul className="space-y-2">
            {enseignantsListe.map((e) => (
              <li
                key={e.id}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium">
                  {e.prenom} {e.nom}
                </span>
                <span className="text-muted-foreground"> — {e.email}</span>
                {e.matieres.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Matières : {e.matieres.join(", ")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => setEnseignantsClasseId(null)}>
            Fermer
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
