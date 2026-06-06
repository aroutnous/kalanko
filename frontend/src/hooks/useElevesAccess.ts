import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface ElevesAccess {
  role: RoleUtilisateur;
  canManage: boolean;
  canManageAbsences: boolean;
}

export function useElevesAccess(): ElevesAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");

  return {
    role,
    canManage: role === "promoteur" || role === "secretaire",
    canManageAbsences:
      role === "promoteur" || role === "directeur" || role === "secretaire",
  };
}
