import { ROUTES } from "@/lib/constants";
import type { RoleUtilisateur } from "@/types";

export function getPostLoginRoute(role: RoleUtilisateur | undefined): string {
  return role === "platform_owner" ? ROUTES.platformDashboard : ROUTES.dashboard;
}

export function getPostLogoutRoute(role: RoleUtilisateur | undefined): string {
  return role === "platform_owner" ? ROUTES.adminLogin : ROUTES.login;
}
