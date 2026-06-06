import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { Cycle } from "@/types";

interface CycleForm {
  nom: string;
  description: string;
  ordre: string;
}

const INITIAL: CycleForm = { nom: "", description: "", ordre: "0" };

export function CyclesPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage } = useEstablishmentAccess();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cycle | null>(null);
  const [form, setForm] = useState<CycleForm>(INITIAL);

  const { data: cycles = [], isLoading } = useQuery({
    queryKey: ["cycles"],
    queryFn: async () => {
      const { data } = await api.get<Cycle[]>(ETABLISSEMENT_API.cycles);
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        nom: form.nom,
        description: form.description || null,
        ordre: Number(form.ordre),
      };
      if (editing) {
        const { data } = await api.put<Cycle>(
          `${ETABLISSEMENT_API.cycles}/${editing.id}`,
          payload,
        );
        return data;
      }
      const { data } = await api.post<Cycle>(ETABLISSEMENT_API.cycles, payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cycles"] });
      toast(editing ? "Cycle mis à jour" : "Cycle créé");
      setOpen(false);
      setEditing(null);
      setForm(INITIAL);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${ETABLISSEMENT_API.cycles}/${id}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cycles"] });
      toast("Cycle supprimé");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const openCreate = (): void => {
    setEditing(null);
    setForm(INITIAL);
    setOpen(true);
  };

  const openEdit = (cycle: Cycle): void => {
    setEditing(cycle);
    setForm({
      nom: cycle.nom,
      description: cycle.description ?? "",
      ordre: String(cycle.ordre),
    });
    setOpen(true);
  };

  const columns: DataTableColumn<Cycle>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "description", header: "Description", render: (r) => r.description ?? "—" },
    { key: "ordre", header: "Ordre", render: (r) => r.ordre },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        canManage ? (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => openEdit(r)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => deleteMutation.mutate(r.id)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
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
        <h2 className="text-lg font-semibold">Cycles</h2>
        {canManage ? (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau cycle
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={columns}
        data={cycles}
        page={1}
        pageSize={cycles.length || 10}
        total={cycles.length}
        onPageChange={() => undefined}
      />

      <FormModal
        open={open}
        title={editing ? "Modifier le cycle" : "Nouveau cycle"}
        onClose={() => setOpen(false)}
        onSubmit={() => saveMutation.mutate()}
        loading={saveMutation.isPending}
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
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
      </FormModal>
    </div>
  );
}
