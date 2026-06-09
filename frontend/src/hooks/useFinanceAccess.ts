import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface FinanceAccess {
  role: RoleUtilisateur;
  canAccessPaiements: boolean;
  canRegisterPaiements: boolean;
  canValidatePaiements: boolean;
  canAccessFrais: boolean;
  canManageFrais: boolean;
  canAccessImpayes: boolean;
  canAccessTransactions: boolean;
  canAccessDepenses: boolean;
  canManageDepenses: boolean;
  canAccessSalaires: boolean;
  canManageSalaires: boolean;
  canAccessCaisse: boolean;
  canAccessTableauBord: boolean;
}

export function useFinanceAccess(): FinanceAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");
  const hasPermission = useHasPermission();

  const canConsultPaiements = hasPermission("paiements.consulter");
  const canEnregistrerPaiements = hasPermission("paiements.enregistrer");

  return {
    role,
    canAccessPaiements: canConsultPaiements || canEnregistrerPaiements,
    canRegisterPaiements: canEnregistrerPaiements,
    canValidatePaiements: hasPermission("paiements.valider"),
    canAccessFrais:
      hasPermission("frais.consulter") || hasPermission("frais.gerer"),
    canManageFrais: hasPermission("frais.gerer"),
    canAccessImpayes:
      canConsultPaiements || hasPermission("paiements.suivre_retard"),
    canAccessTransactions:
      canConsultPaiements || hasPermission("paiements.historique"),
    canAccessDepenses:
      hasPermission("depenses.consulter") || hasPermission("depenses.gerer"),
    canManageDepenses: hasPermission("depenses.gerer"),
    canAccessSalaires:
      hasPermission("salaires.consulter") || hasPermission("salaires.gerer"),
    canManageSalaires: hasPermission("salaires.gerer"),
    canAccessCaisse:
      hasPermission("caisse.consulter") || hasPermission("caisse.gerer"),
    canAccessTableauBord:
      canConsultPaiements ||
      hasPermission("depenses.consulter") ||
      hasPermission("statistiques.finance") ||
      hasPermission("statistiques.pedagogie"),
  };
}
