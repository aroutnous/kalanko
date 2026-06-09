import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface ElevesAccess {
  role: RoleUtilisateur;
  canRead: boolean;
  canManage: boolean;
  canManageAbsences: boolean;
  canDelete: boolean;
  canPrint: boolean;
}

export function useElevesAccess(): ElevesAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");
  const hasPermission = useHasPermission();

  const canManageEleves =
    hasPermission("eleves.inscrire") || hasPermission("eleves.dossiers");

  return {
    role,
    canRead: hasPermission("eleves.consulter"),
    canManage: canManageEleves,
    canManageAbsences:
      hasPermission("absences.consulter") || hasPermission("absences.gerer"),
    canDelete: hasPermission("eleves.dossiers"),
    canPrint:
      hasPermission("documents.cartes_scolaires") ||
      hasPermission("documents.attestations") ||
      hasPermission("documents.certificats"),
  };
}
