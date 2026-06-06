import { useAuthStore } from "@/stores/authStore";
import type { RoleUtilisateur } from "@/types";

interface EstablishmentAccess {
  role: RoleUtilisateur;
  canManage: boolean;
  canEditConfig: boolean;
}

export function useEstablishmentAccess(): EstablishmentAccess {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");

  return {
    role,
    canManage: role === "promoteur",
    canEditConfig: role === "promoteur" || role === "directeur",
  };
}
