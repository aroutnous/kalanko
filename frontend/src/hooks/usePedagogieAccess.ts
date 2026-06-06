import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface PedagogieAccess {
  role: RoleUtilisateur;
  canAccessNotes: boolean;
  canAccessBulletins: boolean;
  canAccessResultats: boolean;
  canAccessHistorique: boolean;
  canSaveNotes: boolean;
  canGenerateBulletins: boolean;
  canLoadBulletins: boolean;
  canValidateBulletins: boolean;
  canPublishBulletins: boolean;
}

export function usePedagogieAccess(): PedagogieAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");

  const isDirecteur = role === "directeur";
  const isSecretaire = role === "secretaire";
  const isPromoteur = role === "promoteur";

  return {
    role,
    canAccessNotes: isDirecteur || isSecretaire,
    canAccessBulletins: isDirecteur || isPromoteur,
    canAccessResultats: isDirecteur || isPromoteur,
    canAccessHistorique: isDirecteur || isPromoteur,
    canSaveNotes: isDirecteur || isSecretaire,
    canGenerateBulletins: isDirecteur,
    canLoadBulletins: isDirecteur || isPromoteur,
    canValidateBulletins: isDirecteur,
    canPublishBulletins: isDirecteur,
  };
}
