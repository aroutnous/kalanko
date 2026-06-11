import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import { PLATFORM_API } from "@/lib/platform-api";
import { buildTenantLoginUrl } from "@/lib/tenant-login";
import { TenantEditModal } from "@/pages/platform/TenantEditModal";
import { useToastStore } from "@/stores/toastStore";
import type { PlatformTenant, StatutTenant } from "@/types";

const PAGE_SIZE = 10;

const STATUT_LABELS: Record<StatutTenant, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  inactif: "Inactif",
};

export function TenantsListPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [page, setPage] = useState(1);
  const [statutFilter, setStatutFilter] = useState<StatutTenant | "">("");
  const [editTenant, setEditTenant] = useState<PlatformTenant | null>(null);
  const [deleteTenant, setDeleteTenant] = useState<PlatformTenant | null>(null);

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["platform-tenants", statutFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statutFilter) params.statut = statutFilter;
      const { data } = await api.get<PlatformTenant[]>(PLATFORM_API.tenants, { params });
      return data;
    },
  });

  const statutMutation = useMutation({
    mutationFn: async ({
      tenantId,
      action,
    }: {
      tenantId: string;
      action: "suspendre" | "activer";
    }) => {
      const url =
        action === "suspendre"
          ? PLATFORM_API.tenantSuspendre(tenantId)
          : PLATFORM_API.tenantActiver(tenantId);
      const { data } = await api.put<PlatformTenant>(url);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      await api.delete(PLATFORM_API.tenant(tenantId));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["platform-stats"] });
      toast("Tenant supprimé");
      setDeleteTenant(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tenants.slice(start, start + PAGE_SIZE);
  }, [tenants, page]);

  const columns: DataTableColumn<PlatformTenant>[] = [
    { key: "nom", header: "Nom", render: (r) => r.nom },
    { key: "slug", header: "Slug", render: (r) => r.slug },
    { key: "email", header: "Email", render: (r) => r.email ?? "—" },
    {
      key: "login",
      header: "Lien de connexion",
      render: (r) => {
        const url = buildTenantLoginUrl(r.slug);
        return (
          <div className="flex items-center gap-2">
            <span className="max-w-[200px] truncate text-xs" title={url}>
              {url}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(url);
                toast("Lien copié");
              }}
              title="Copier le lien"
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
    {
      key: "statut",
      header: "Statut",
      render: (r) => (
        <span
          className={
            r.statut === "actif"
              ? "text-emerald-700"
              : r.statut === "suspendu"
                ? "text-amber-700"
                : "text-muted-foreground"
          }
        >
          {STATUT_LABELS[r.statut]}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditTenant(r)}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Link to={`/platform/tenants/${r.id}/utilisateurs`}>
            <Button variant="outline" size="sm" title="Gérer utilisateurs">
              <Users className="h-4 w-4" />
            </Button>
          </Link>
          {r.statut === "actif" ? (
            <Button
              variant="outline"
              size="sm"
              disabled={statutMutation.isPending}
              onClick={() =>
                statutMutation.mutate({ tenantId: r.id, action: "suspendre" })
              }
            >
              Suspendre
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={statutMutation.isPending}
              onClick={() => statutMutation.mutate({ tenantId: r.id, action: "activer" })}
            >
              Activer
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteTenant(r)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Tenants"
        description="Établissements inscrits sur la plateforme"
        breadcrumb="Platform Owner"
        action={
          <Link to={ROUTES.platformTenantsCreate}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau tenant
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Select
          value={statutFilter}
          onChange={(e) => {
            setStatutFilter(e.target.value as StatutTenant | "");
            setPage(1);
          }}
          className="max-w-xs"
        >
          <option value="">Tous les statuts</option>
          <option value="actif">Actif</option>
          <option value="suspendu">Suspendu</option>
          <option value="inactif">Inactif</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <DataTable
          columns={columns}
          data={paginated}
          page={page}
          pageSize={PAGE_SIZE}
          total={tenants.length}
          onPageChange={setPage}
        />
      )}

      <TenantEditModal
        open={editTenant !== null}
        tenant={editTenant}
        onClose={() => setEditTenant(null)}
        onSaved={() => {
          void queryClient.invalidateQueries({ queryKey: ["platform-tenants"] });
        }}
      />

      <Dialog open={deleteTenant !== null} onClose={() => setDeleteTenant(null)}>
        <h2 className="mb-2 pr-8 text-lg font-semibold">Confirmer la suppression</h2>
        <p className="text-sm text-muted-foreground">
          Supprimer {deleteTenant?.nom} ? Cette action supprimera toutes les données du
          tenant. Elle est irréversible.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTenant(null)}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (deleteTenant) deleteMutation.mutate(deleteTenant.id);
            }}
          >
            {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
