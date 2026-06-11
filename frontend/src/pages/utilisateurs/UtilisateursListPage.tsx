import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, KeyRound, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { PermissionsModal, type PermissionsModalUser } from "@/components/utilisateurs/PermissionsModal";
import { TempPasswordDisplay } from "@/components/utilisateurs/TempPasswordDisplay";
import {
  UtilisateurEditModal,
  type UtilisateurEditValues,
} from "@/components/utilisateurs/UtilisateurEditModal";
import { Dialog } from "@/components/ui/dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/constants";
import { buildTenantLoginUrl } from "@/lib/tenant-login";
import { formatPermissionCount } from "@/lib/permissions";
import { UTILISATEURS_API } from "@/lib/utilisateurs-api";
import { CreerUtilisateurModal } from "@/pages/utilisateurs/CreerUtilisateurModal";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import type {
  RoleUtilisateur,
  StatutUtilisateur,
  MotDePasseTemporaireResponse,
  UtilisateurCreateResponse,
  UtilisateurListItem,
  UtilisateurPermissionsResponse,
} from "@/types";

const PAGE_SIZE = 10;

function RoleBadge({ role }: { role: RoleUtilisateur }): React.JSX.Element {
  return <Badge variant="default">{ROLE_LABELS[role] ?? role}</Badge>;
}

function StatutBadge({ statut }: { statut: StatutUtilisateur }): React.JSX.Element {
  return (
    <Badge variant={statut === "actif" ? "success" : "muted"}>
      {statut === "actif" ? "Actif" : "Inactif"}
    </Badge>
  );
}

export function UtilisateursListPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const tenantSlug = useAuthStore((s) => s.tenant?.slug ?? s.user?.tenant_slug);
  const [modalOpen, setModalOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState("");
  const [statutFilter, setStatutFilter] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<string | null>(null);
  const [permissionsUser, setPermissionsUser] = useState<PermissionsModalUser | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [createdMessage, setCreatedMessage] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<UtilisateurListItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UtilisateurListItem | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);

  const { data: utilisateurs = [], isLoading } = useQuery({
    queryKey: ["utilisateurs"],
    queryFn: async () => {
      const { data } = await api.get<UtilisateurListItem[]>(UTILISATEURS_API.list);
      return data;
    },
  });

  const filtered = useMemo(() => {
    return utilisateurs.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (statutFilter && u.statut !== statutFilter) return false;
      return true;
    });
  }, [utilisateurs, roleFilter, statutFilter]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const permissionQueries = useQueries({
    queries: paginated
      .filter((user) => user.role !== "promoteur")
      .map((user) => ({
        queryKey: ["utilisateurs", user.id, "permissions"],
        queryFn: async () => {
          const { data } = await api.get<UtilisateurPermissionsResponse>(
            UTILISATEURS_API.permissions(user.id),
          );
          return data;
        },
      })),
  });

  const permissionCountByUserId = useMemo(() => {
    const counts = new Map<string, number>();
    paginated
      .filter((user) => user.role !== "promoteur")
      .forEach((user, index) => {
        const query = permissionQueries[index];
        if (query?.data) {
          counts.set(user.id, query.data.permissions.length);
        }
      });
    return counts;
  }, [paginated, permissionQueries]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(UTILISATEURS_API.detail(id));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast("Utilisateur supprimé");
      setDeleteUser(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<MotDePasseTemporaireResponse>(
        UTILISATEURS_API.resetPassword(id),
      );
      return data.mot_de_passe_temporaire;
    },
    onSuccess: (password) => {
      setResetPassword(password);
      setActionId(null);
      toast("Mot de passe réinitialisé");
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
      setActionId(null);
    },
  });

  const handleEditUser = async (values: UtilisateurEditValues): Promise<void> => {
    if (!editUser) return;
    await api.put(UTILISATEURS_API.detail(editUser.id), {
      nom: values.nom,
      prenom: values.prenom,
      email: values.email,
    });
    void queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
  };

  const statutMutation = useMutation({
    mutationFn: async ({
      id,
      statut,
    }: {
      id: string;
      statut: StatutUtilisateur;
    }) => {
      setActionId(id);
      const { data } = await api.put<UtilisateurListItem>(
        UTILISATEURS_API.statut(id),
        { statut },
      );
      return data;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["utilisateurs"] });
      toast(
        data.statut === "actif"
          ? "Utilisateur réactivé"
          : "Utilisateur désactivé",
      );
      setActionId(null);
    },
    onError: (err) => {
      toast(getErrorMessage(err), "error");
      setActionId(null);
    },
  });

  const openPermissionsModal = (user: UtilisateurListItem): void => {
    setPermissionsUser({
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    });
    setCreatedMessage(false);
    setTemporaryPassword(null);
    setPermissionsOpen(true);
  };

  const handleUserCreated = (user: UtilisateurCreateResponse): void => {
    setPermissionsUser({
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
    });
    setCreatedMessage(true);
    setTemporaryPassword(user.mot_de_passe_temporaire);
    setPermissionsOpen(true);
    toast("Utilisateur créé. Configurez maintenant ses permissions.");
  };

  const closePermissionsModal = (): void => {
    setPermissionsOpen(false);
    setPermissionsUser(null);
    setCreatedMessage(false);
    setTemporaryPassword(null);
  };

  const columns: DataTableColumn<UtilisateurListItem>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "prenom", header: "Prénom", render: (r) => r.prenom },
    { key: "email", header: "Email", render: (r) => r.email },
    {
      key: "role",
      header: "Rôle",
      render: (r) => <RoleBadge role={r.role} />,
    },
    {
      key: "statut",
      header: "Statut",
      render: (r) => <StatutBadge statut={r.statut} />,
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (r) => {
        if (r.role === "promoteur") {
          return <Badge variant="muted">Toutes</Badge>;
        }
        const count = permissionCountByUserId.get(r.id);
        if (count === undefined) {
          return <span className="text-xs text-muted-foreground">…</span>;
        }
        return <Badge variant="default">{formatPermissionCount(count)}</Badge>;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => {
        const isSelf = r.id === currentUserId;
        const isPromoteur = r.role === "promoteur";
        const disabled = isSelf || isPromoteur || actionId === r.id;

        return (
          <div className="flex flex-wrap gap-2">
            {!isPromoteur ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditUser(r)}
                  title="Modifier"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={actionId === r.id}
                  onClick={() => {
                    setActionId(r.id);
                    resetMutation.mutate(r.id);
                  }}
                  title="Reset mot de passe"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPermissionsModal(r)}
                >
                  <Shield className="mr-1 h-4 w-4" />
                  Permissions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isSelf}
                  onClick={() => setDeleteUser(r)}
                  title="Supprimer"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() =>
                statutMutation.mutate({
                  id: r.id,
                  statut: r.statut === "actif" ? "inactif" : "actif",
                })
              }
            >
              {r.statut === "actif" ? "Désactiver" : "Activer"}
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return <LoadingSpinner label="Chargement des utilisateurs…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes de votre établissement"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Créer un utilisateur
          </Button>
        }
      />

      {tenantSlug ? (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Partagez ce lien avec vos utilisateurs :
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-background px-2 py-1 text-sm">
              {buildTenantLoginUrl(tenantSlug)}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(buildTenantLoginUrl(tenantSlug));
                toast("Lien copié");
              }}
            >
              <Copy className="mr-1 h-4 w-4" />
              Copier
            </Button>
          </div>
        </div>
      ) : null}

      {resetPassword ? (
        <div className="mb-4">
          <TempPasswordDisplay
            password={resetPassword}
            onExpire={() => setResetPassword(null)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
          aria-label="Filtrer par rôle"
        >
          <option value="">Tous les rôles</option>
          <option value="promoteur">{ROLE_LABELS.promoteur}</option>
          <option value="directeur">{ROLE_LABELS.directeur}</option>
          <option value="secretaire">{ROLE_LABELS.secretaire}</option>
          <option value="comptable">{ROLE_LABELS.comptable}</option>
        </Select>
        <Select
          value={statutFilter}
          onChange={(e) => {
            setStatutFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
          aria-label="Filtrer par statut"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="inactif">Inactif</option>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        page={page}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
        emptyMessage="Aucun utilisateur"
      />

      <CreerUtilisateurModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ["utilisateurs"] })}
        onUserCreated={handleUserCreated}
      />

      <PermissionsModal
        open={permissionsOpen}
        onClose={closePermissionsModal}
        user={permissionsUser}
        createdMessage={createdMessage}
        temporaryPassword={temporaryPassword}
      />

      <UtilisateurEditModal
        open={editUser !== null}
        title="Modifier l'utilisateur"
        initial={{
          nom: editUser?.nom ?? "",
          prenom: editUser?.prenom ?? "",
          email: editUser?.email ?? "",
        }}
        onClose={() => setEditUser(null)}
        onSubmit={handleEditUser}
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
