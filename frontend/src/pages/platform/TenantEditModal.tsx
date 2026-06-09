import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { FormModal } from "@/components/etablissement/FormModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, getErrorMessage } from "@/lib/api";
import { PLATFORM_API } from "@/lib/platform-api";
import { useToastStore } from "@/stores/toastStore";
import type { PlatformTenant } from "@/types";

interface TenantForm {
  nom: string;
  email_contact: string;
  telephone: string;
  adresse: string;
  slug: string;
}

interface TenantEditModalProps {
  open: boolean;
  tenant: PlatformTenant | null;
  onClose: () => void;
  onSaved: () => void;
}

function toForm(tenant: PlatformTenant): TenantForm {
  return {
    nom: tenant.nom,
    email_contact: tenant.email ?? "",
    telephone: tenant.telephone ?? "",
    adresse: tenant.adresse ?? "",
    slug: tenant.slug,
  };
}

export function TenantEditModal({
  open,
  tenant,
  onClose,
  onSaved,
}: TenantEditModalProps): React.JSX.Element {
  const toast = useToastStore((s) => s.show);
  const [form, setForm] = useState<TenantForm>({
    nom: "",
    email_contact: "",
    telephone: "",
    adresse: "",
    slug: "",
  });

  useEffect(() => {
    if (open && tenant) setForm(toForm(tenant));
  }, [open, tenant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenant) return;
      const body: Record<string, string> = { nom: form.nom, slug: form.slug };
      if (form.email_contact) body.email_contact = form.email_contact;
      if (form.telephone) body.telephone = form.telephone;
      if (form.adresse) body.adresse = form.adresse;
      const { data } = await api.put<PlatformTenant>(
        PLATFORM_API.tenant(tenant.id),
        body,
      );
      return data;
    },
    onSuccess: () => {
      toast("Tenant modifié");
      onSaved();
      onClose();
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  return (
    <FormModal
      open={open && tenant !== null}
      title="Modifier le tenant"
      onClose={onClose}
      onSubmit={() => saveMutation.mutate()}
      loading={saveMutation.isPending}
    >
      <div className="space-y-2">
        <Label htmlFor="tenant-nom">Nom</Label>
        <Input
          id="tenant-nom"
          value={form.nom}
          onChange={(e) => setForm((p) => ({ ...p, nom: e.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tenant-email">Email de contact</Label>
        <Input
          id="tenant-email"
          type="email"
          value={form.email_contact}
          onChange={(e) => setForm((p) => ({ ...p, email_contact: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tenant-telephone">Téléphone</Label>
        <Input
          id="tenant-telephone"
          value={form.telephone}
          onChange={(e) => setForm((p) => ({ ...p, telephone: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tenant-adresse">Adresse</Label>
        <Input
          id="tenant-adresse"
          value={form.adresse}
          onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tenant-slug">Slug</Label>
        <Input
          id="tenant-slug"
          value={form.slug}
          onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
          required
        />
      </div>
    </FormModal>
  );
}
