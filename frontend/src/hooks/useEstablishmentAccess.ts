import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface EstablishmentAccess {
  role: RoleUtilisateur;
  canRead: boolean;
  canManage: boolean;
  canEditConfig: boolean;
}

export function useEstablishmentAccess(): EstablishmentAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");
  const hasPermission = useHasPermission();

  const canConfigure = hasPermission("etablissement.configurer");

  return {
    role,
    canRead:
      hasPermission("etablissement.acceder") ||
      canConfigure ||
      hasPermission("classes.consulter") ||
      hasPermission("classes.gerer"),
    canManage: canConfigure || hasPermission("classes.gerer"),
    canEditConfig: canConfigure,
  };
}
