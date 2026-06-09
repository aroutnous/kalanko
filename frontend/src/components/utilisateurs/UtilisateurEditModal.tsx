import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { getErrorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLES_CREATABLE } from "@/lib/utilisateurs-api";
import { useToastStore } from "@/stores/toastStore";
import type { RoleUtilisateur } from "@/types";

export interface UtilisateurEditValues {
  nom: string;
  prenom: string;
  email: string;
  role?: RoleUtilisateur;
}

interface UtilisateurEditModalProps {
  open: boolean;
  title: string;
  initial: UtilisateurEditValues;
  showRole?: boolean;
  onClose: () => void;
  onSubmit: (values: UtilisateurEditValues) => Promise<void>;
}

export function UtilisateurEditModal({
  open,
  title,
  initial,
  showRole = false,
  onClose,
  onSubmit,
}: UtilisateurEditModalProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<UtilisateurEditValues>(initial);

  useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const saveMutation = useMutation({
    mutationFn: async () => onSubmit(form),
    onSuccess: () => {
      toast("Utilisateur modifié");
      onClose();
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  return (
    <FormModal
      open={open}
      title={title}
      onClose={onClose}
      onSubmit={() => saveMutation.mutate()}
      loading={saveMutation.isPending}
    >
      <div className="space-y-2">
        <Label htmlFor="edit-nom">Nom</Label>
        <Input
          id="edit-nom"
          value={form.nom}
          onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-prenom">Prénom</Label>
        <Input
          id="edit-prenom"
          value={form.prenom}
          onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-email">Email</Label>
        <Input
          id="edit-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          required
        />
      </div>
      {showRole ? (
        <div className="space-y-2">
          <Label htmlFor="edit-role">Rôle</Label>
          <Select
            id="edit-role"
            value={form.role ?? ""}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                role: e.target.value as RoleUtilisateur,
              }))
            }
          >
            <option value="promoteur">{ROLE_LABELS.promoteur}</option>
            {ROLES_CREATABLE.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
    </FormModal>
  );
}
