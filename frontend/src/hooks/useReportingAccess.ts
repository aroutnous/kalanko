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

  const isPromoteur = role === "promoteur";
  const isDirecteur = role === "directeur";
  const isComptable = role === "comptable";
  const isSecretaire = role === "secretaire";

  return {
    role,
    canAccessTableauBord:
      isPromoteur || isDirecteur || isComptable || isSecretaire,
    canAccessStatistiques: isPromoteur || isDirecteur || isComptable,
    canAccessExports: isPromoteur || isDirecteur || isComptable,
    canAccessImpressions:
      isPromoteur || isDirecteur || isComptable || isSecretaire,
  };
}
