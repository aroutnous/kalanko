import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { ROLES_CREATABLE, UTILISATEURS_API } from "@/lib/utilisateurs-api";
import { useToastStore } from "@/stores/toastStore";
import type { UtilisateurCreatePayload, UtilisateurCreateResponse } from "@/types";

interface CreerUtilisateurModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  onUserCreated?: (user: UtilisateurCreateResponse) => void;
}

const INITIAL_FORM: UtilisateurCreatePayload = {
  nom: "",
  prenom: "",
  email: "",
  role: "directeur",
  mot_de_passe: "",
};

export function CreerUtilisateurModal({
  open,
  onClose,
  onCreated,
  onUserCreated,
}: CreerUtilisateurModalProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<UtilisateurCreatePayload>(INITIAL_FORM);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: UtilisateurCreatePayload = {
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
      };
      if (form.mot_de_passe?.trim()) {
        payload.mot_de_passe = form.mot_de_passe.trim();
      }
      const { data } = await api.post<UtilisateurCreateResponse>(
        UTILISATEURS_API.create,
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      onCreated();
      setForm(INITIAL_FORM);
      onClose();
      onUserCreated?.(data);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const handleClose = (): void => {
    setForm(INITIAL_FORM);
    onClose();
  };

  return (
    <FormModal
      open={open}
      title="Créer un utilisateur"
      onClose={handleClose}
      onSubmit={() => createMutation.mutate()}
      loading={createMutation.isPending}
      submitLabel="Créer"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="create-nom">Nom</Label>
          <Input
            id="create-nom"
            value={form.nom}
            onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="create-prenom">Prénom</Label>
          <Input
            id="create-prenom"
            value={form.prenom}
            onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-email">Email</Label>
        <Input
          id="create-email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-role">Rôle</Label>
        <Select
          id="create-role"
          value={form.role}
          onChange={(e) =>
            setForm((f) => ({
              ...f,
              role: e.target.value as UtilisateurCreatePayload["role"],
            }))
          }
        >
          {ROLES_CREATABLE.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-password">Mot de passe temporaire (optionnel)</Label>
        <Input
          id="create-password"
          type="password"
          value={form.mot_de_passe ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, mot_de_passe: e.target.value }))}
          placeholder="Laisser vide pour génération automatique"
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">
          Si vide, un mot de passe sera généré et affiché une seule fois.
        </p>
      </div>
    </FormModal>
  );
}
