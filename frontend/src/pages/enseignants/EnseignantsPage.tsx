import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import {
  AffectationModal,
  type AffectationMode,
} from "@/components/enseignants/AffectationModal";
import {
  EnseignantForm,
  INITIAL_ENSEIGNANT_FORM,
  type EnseignantFormValues,
} from "@/components/enseignants/EnseignantForm";
import { EnseignantMatieresField } from "@/components/enseignants/EnseignantMatieresField";
import { FormModal } from "@/components/etablissement/FormModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { useHasPermission } from "@/hooks/useHasPermission";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ENSEIGNANTS_API } from "@/lib/enseignants-api";
import { useToastStore } from "@/stores/toastStore";
import type { Enseignant, StatutEnseignant } from "@/types";

const STATUT_LABELS: Record<StatutEnseignant, string> = {
  actif: "Actif",
  inactif: "Inactif",
  conge: "Congé",
};

const STATUT_VARIANTS: Record<
  StatutEnseignant,
  "success" | "muted" | "warning"
> = {
  actif: "success",
  inactif: "muted",
  conge: "warning",
};

function toFormValues(e: Enseignant): EnseignantFormValues {
  return {
    nom: e.nom,
    prenom: e.prenom,
    email: e.email,
    telephone: e.telephone ?? "",
    adresse: e.adresse ?? "",
    date_embauche: e.date_embauche ?? "",
    salaire_base: String(e.salaire_base),
    statut: e.statut,
  };
}

function toPayload(values: EnseignantFormValues, edit: boolean) {
  const body: Record<string, string | number> = {
    nom: values.nom,
    prenom: values.prenom,
    email: values.email,
  };
  if (values.telephone) body.telephone = values.telephone;
  if (values.adresse) body.adresse = values.adresse;
  if (values.date_embauche) body.date_embauche = values.date_embauche;
  if (values.salaire_base) body.salaire_base = Number(values.salaire_base);
  if (edit) body.statut = values.statut;
  return body;
}

export function EnseignantsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { can } = useMenuAccess();
  const hasPermission = useHasPermission();
  const canManage = can.enseignantsGerer;
  const canRead =
    hasPermission("enseignants.consulter") || canManage;

  const [statutFilter, setStatutFilter] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Enseignant | null>(null);
  const [form, setForm] = useState<EnseignantFormValues>(INITIAL_ENSEIGNANT_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Enseignant | null>(null);
  const [affectMode, setAffectMode] = useState<AffectationMode | null>(null);
  const [affectTarget, setAffectTarget] = useState<Enseignant | null>(null);

  const { data: enseignants = [], isLoading } = useQuery({
    queryKey: ["enseignants", statutFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statutFilter) params.statut = statutFilter;
      const { data } = await api.get<Enseignant[]>(ENSEIGNANTS_API.list, { params });
      return data;
    },
    enabled: canRead,
  });

  const filtered = useMemo(() => enseignants, [enseignants]);

  const createMutation = useMutation({
    mutationFn: async (values: EnseignantFormValues) => {
      const { data } = await api.post<Enseignant>(
        ENSEIGNANTS_API.list,
        toPayload(values, false),
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      toast("Enseignant créé");
      setFormOpen(false);
      setForm(INITIAL_ENSEIGNANT_FORM);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: EnseignantFormValues;
    }) => {
      const { data } = await api.put<Enseignant>(
        ENSEIGNANTS_API.detail(id),
        toPayload(values, true),
      );
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      void queryClient.invalidateQueries({ queryKey: ["matieres"] });
      toast("Enseignant modifié");
      setEditTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ENSEIGNANTS_API.detail(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["enseignants"] });
      toast("Enseignant supprimé");
      setDeleteTarget(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openCreate = (): void => {
    setForm(INITIAL_ENSEIGNANT_FORM);
    setFormOpen(true);
  };

  const openEdit = (e: Enseignant): void => {
    setEditTarget(e);
    setForm(toFormValues(e));
  };

  const columns: DataTableColumn<Enseignant>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "prenom", header: "Prénom", render: (r) => r.prenom },
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "telephone",
      header: "Téléphone",
      render: (r) => r.telephone ?? "—",
    },
    {
      key: "statut",
      header: "Statut",
      render: (r) => (
        <Badge variant={STATUT_VARIANTS[r.statut]}>
          {STATUT_LABELS[r.statut]}
        </Badge>
      ),
    },
    {
      key: "matieres",
      header: "Matières",
      render: (r) => r.matieres.length,
    },
    {
      key: "classes",
      header: "Classes",
      render: (r) => r.classes.length,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Actions",
            render: (r: Enseignant) => (
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(r)}
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAffectTarget(r);
                    setAffectMode("classe");
                  }}
                  title="Affecter classe"
                >
                  <GraduationCap className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(r)}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ),
          } satisfies DataTableColumn<Enseignant>,
        ]
      : []),
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
        title="Enseignants"
        description="Gestion du corps enseignant et des affectations"
        action={
          canManage ? (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un enseignant
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4 max-w-xs">
        <Select
          value={statutFilter}
          onChange={(e) => setStatutFilter(e.target.value)}
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
          <option value="conge">Congé</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        page={1}
        pageSize={filtered.length || 10}
        total={filtered.length}
        onPageChange={() => undefined}
        emptyMessage="Aucun enseignant"
      />

      <FormModal
        open={formOpen}
        title="Nouvel enseignant"
        onClose={() => setFormOpen(false)}
        onSubmit={() => createMutation.mutate(form)}
        loading={createMutation.isPending}
      >
        <EnseignantForm
          values={form}
          onChange={(field, value) => setForm((p) => ({ ...p, [field]: value }))}
        />
      </FormModal>

      <FormModal
        open={editTarget !== null}
        title="Modifier l'enseignant"
        onClose={() => setEditTarget(null)}
        onSubmit={() => {
          if (editTarget) updateMutation.mutate({ id: editTarget.id, values: form });
        }}
        loading={updateMutation.isPending}
      >
        <EnseignantForm
          values={form}
          onChange={(field, value) => setForm((p) => ({ ...p, [field]: value }))}
          showStatut
        />
        {editTarget ? (
          <EnseignantMatieresField enseignantId={editTarget.id} />
        ) : null}
      </FormModal>

      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)}>
        <h2 className="mb-2 pr-8 text-lg font-semibold">Confirmer la suppression</h2>
        <p className="text-sm text-muted-foreground">
          Supprimer {deleteTarget?.prenom} {deleteTarget?.nom} ? Cette action est
          irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
            }}
          >
            {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Dialog>

      {affectTarget && affectMode ? (
        <AffectationModal
          open
          mode={affectMode}
          enseignantId={affectTarget.id}
          enseignantLabel={`${affectTarget.prenom} ${affectTarget.nom}`}
          onClose={() => {
            setAffectTarget(null);
            setAffectMode(null);
          }}
        />
      ) : null}
    </div>
  );
}
