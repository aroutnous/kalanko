import { useHasPermission } from "@/hooks/useHasPermission";
import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface UtilisateursAccess {
  role: RoleUtilisateur;
  canManageUsers: boolean;
  canViewUsers: boolean;
}

export function useUtilisateursAccess(): UtilisateursAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");
  const hasPermission = useHasPermission();

  return {
    role,
    canManageUsers: hasPermission("utilisateurs.gerer"),
    canViewUsers:
      hasPermission("utilisateurs.consulter") ||
      hasPermission("utilisateurs.gerer"),
  };
}
