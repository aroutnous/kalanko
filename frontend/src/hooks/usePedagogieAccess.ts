import { useHasPermission } from "@/hooks/useHasPermission";
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
  const hasPermission = useHasPermission();

  const canGenererBulletins = hasPermission("bulletins.generer");
  const canValiderBulletins = hasPermission("bulletins.valider");
  const canPublierBulletins = hasPermission("bulletins.publier");

  return {
    role,
    canAccessNotes:
      hasPermission("notes.consulter") || hasPermission("notes.saisir"),
    canAccessBulletins:
      canGenererBulletins || canValiderBulletins || canPublierBulletins,
    canAccessResultats:
      hasPermission("notes.consulter") ||
      hasPermission("resultats.consulter") ||
      canGenererBulletins,
    canAccessHistorique: hasPermission("notes.consulter"),
    canSaveNotes: hasPermission("notes.saisir"),
    canGenerateBulletins: canGenererBulletins,
    canLoadBulletins:
      canGenererBulletins || canValiderBulletins || canPublierBulletins,
    canValidateBulletins: canValiderBulletins,
    canPublishBulletins: canPublierBulletins,
  };
}
