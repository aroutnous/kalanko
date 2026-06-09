import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, KeyRound, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { TempPasswordDisplay } from "@/components/utilisateurs/TempPasswordDisplay";
import {
  UtilisateurEditModal,
  type UtilisateurEditValues,
} from "@/components/utilisateurs/UtilisateurEditModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { api, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS, ROUTES } from "@/lib/constants";
import { PLATFORM_API } from "@/lib/platform-api";
import { useToastStore } from "@/stores/toastStore";
import type {
  MotDePasseTemporaireResponse,
  PlatformTenant,
  RoleUtilisateur,
  UtilisateurTenantItem,
} from "@/types";

export function TenantUtilisateursPage(): React.JSX.Element {
  const { tenantId = "" } = useParams<{ tenantId: string }>();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);

  const [editUser, setEditUser] = useState<UtilisateurTenantItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UtilisateurTenantItem | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: tenant } = useQuery({
    queryKey: ["platform-tenant", tenantId],
    queryFn: async () => {
      const { data } = await api.get<PlatformTenant[]>(PLATFORM_API.tenants);
      return data.find((t) => t.id === tenantId) ?? null;
    },
    enabled: Boolean(tenantId),
  });

  const { data: utilisateurs = [], isLoading } = useQuery({
    queryKey: ["platform-tenant-users", tenantId],
    queryFn: async () => {
      const { data } = await api.get<UtilisateurTenantItem[]>(
        PLATFORM_API.tenantUtilisateurs(tenantId),
      );
      return data;
    },
    enabled: Boolean(tenantId),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(PLATFORM_API.tenantUtilisateur(tenantId, userId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["platform-tenant-users", tenantId],
      });
      toast("Utilisateur supprimé");
      setDeleteUser(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const resetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await api.post<MotDePasseTemporaireResponse>(
        PLATFORM_API.tenantResetPassword(tenantId, userId),
      );
      return data.mot_de_passe_temporaire;
    },
    onSuccess: (password) => {
      setTempPassword(password);
      setActionId(null);
      toast("Mot de passe réinitialisé");
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
      setActionId(null);
    },
  });

  const handleEdit = async (values: UtilisateurEditValues): Promise<void> => {
    if (!editUser) return;
    const body: Record<string, string> = {
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
    };
    if (values.role && editUser.role !== "promoteur") {
      body.role = values.role;
    }
    await api.put(PLATFORM_API.tenantUtilisateur(tenantId, editUser.id), body);
    void queryClient.invalidateQueries({
      queryKey: ["platform-tenant-users", tenantId],
    });
  };

  const columns: DataTableColumn<UtilisateurTenantItem>[] = useMemo(
    () => [
      { key: "nom", header: "Nom", render: (r) => r.nom },
      { key: "prenom", header: "Prénom", render: (r) => r.prenom },
      { key: "email", header: "Email", render: (r) => r.email },
      {
        key: "role",
        header: "Rôle",
        render: (r) => (
          <Badge variant="default">{ROLE_LABELS[r.role] ?? r.role}</Badge>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (r) => {
          const isPromoteur = r.role === "promoteur";
          return (
            <div className="flex flex-wrap gap-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditUser(r)}
                title="Modifier"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={actionId === r.id}
                onClick={() => {
                  setActionId(r.id);
                  resetMutation.mutate(r.id);
                }}
                title="Reset mot de passe"
              >
                <KeyRound className="h-4 w-4" />
              </Button>
              {!isPromoteur ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteUser(r)}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [actionId, resetMutation],
  );

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <Link
        to={ROUTES.platformTenants}
        className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour aux tenants
      </Link>

      <PageHeader
        title="Utilisateurs du tenant"
        description={tenant ? `${tenant.nom} (${tenant.slug})` : tenantId}
        breadcrumb="Platform Owner"
      />

      {tempPassword ? (
        <div className="mb-6">
          <TempPasswordDisplay
            password={tempPassword}
            onExpire={() => setTempPassword(null)}
          />
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={utilisateurs}
        page={1}
        pageSize={utilisateurs.length || 10}
        total={utilisateurs.length}
        onPageChange={() => undefined}
        emptyMessage="Aucun utilisateur"
      />

      <UtilisateurEditModal
        open={editUser !== null}
        title="Modifier l'utilisateur"
        initial={{
          nom: editUser?.nom ?? "",
          prenom: editUser?.prenom ?? "",
          email: editUser?.email ?? "",
          role: editUser?.role as RoleUtilisateur | undefined,
        }}
        showRole={editUser?.role !== "promoteur"}
        onClose={() => setEditUser(null)}
        onSubmit={handleEdit}
      />

      <Dialog open={deleteUser !== null} onClose={() => setDeleteUser(null)}>
        <h2 className="mb-2 pr-8 text-lg font-semibold">Confirmer la suppression</h2>
        <p className="text-sm text-muted-foreground">
          Supprimer {deleteUser?.prenom} {deleteUser?.nom} ? Cette action est
          irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteUser(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (deleteUser) deleteMutation.mutate(deleteUser.id);
            }}
          >
            {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
