import type { MenuAccess } from "@/hooks/useMenuAccess";
import { ROUTES } from "@/lib/constants";

export function canAccessPath(
  pathname: string,
  menuAccess: MenuAccess,
  _hasPermission: (permission: string) => boolean,
): boolean {
  if (
    pathname === ROUTES.dashboard ||
    pathname === ROUTES.profil ||
    pathname === "/"
  ) {
    return true;
  }

  if (pathname.startsWith("/etablissement")) {
    return menuAccess.showEtablissement;
  }

  if (pathname.startsWith("/enseignants")) {
    return menuAccess.showEnseignants;
  }

  if (
    pathname.startsWith("/classes") ||
    pathname.startsWith("/etablissement/classes")
  ) {
    return menuAccess.showClasses;
  }

  if (pathname === ROUTES.elevesInscrire) {
    return menuAccess.can.elevesInscrire;
  }

  if (
    pathname === ROUTES.absences ||
    pathname === ROUTES.elevesAbsences ||
    pathname.startsWith("/absences")
  ) {
    return menuAccess.showAbsences;
  }

  if (pathname.startsWith("/eleves")) {
    return menuAccess.showEleves;
  }

  if (pathname.startsWith("/pedagogie")) {
    return menuAccess.showPedagogie;
  }

  if (
    pathname.startsWith("/paiements") ||
    pathname.startsWith("/finance/paiements")
  ) {
    return menuAccess.showPaiements;
  }

  if (pathname.startsWith("/finance")) {
    return menuAccess.showFinance;
  }

  if (pathname.startsWith("/documents")) {
    return menuAccess.showDocuments;
  }

  if (pathname.startsWith("/rapports") || pathname.startsWith("/reporting")) {
    return menuAccess.showRapports;
  }

  if (pathname === ROUTES.utilisateurs) {
    return menuAccess.showUtilisateurs;
  }

  return true;
}
