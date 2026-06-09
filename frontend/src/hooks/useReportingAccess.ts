import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface ReportingAccess {
  role: RoleUtilisateur;
  canAccessTableauBord: boolean;
  canAccessStatistiques: boolean;
  canAccessExports: boolean;
  canAccessImpressions: boolean;
}

export function useReportingAccess(): ReportingAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");
  const hasPermission = useHasPermission();

  const canStats =
    hasPermission("statistiques.pedagogie") ||
    hasPermission("statistiques.finance");

  return {
    role,
    canAccessTableauBord:
      hasPermission("rapports.financiers") || canStats,
    canAccessStatistiques: canStats,
    canAccessExports:
      hasPermission("rapports.financiers") ||
      hasPermission("documents.rapports"),
    canAccessImpressions:
      hasPermission("rapports.imprimer") ||
      hasPermission("documents.bulletins") ||
      hasPermission("documents.recus") ||
      hasPermission("documents.cartes_scolaires") ||
      hasPermission("documents.attestations") ||
      hasPermission("documents.certificats") ||
      hasPermission("documents.listes_classe"),
  };
}
