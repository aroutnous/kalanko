import { useAuthStore } from "@/stores/authStore";

export function useMenuAccess() {
  const { user, hasPermission } = useAuthStore();
  const isPromoteur = user?.role === "promoteur";

  const has = (permission: string) => isPromoteur || hasPermission(permission);

  const hasAny = (permissions: string[]) =>
    isPromoteur || permissions.some((p) => hasPermission(p));

  return {
    showEtablissement: hasAny([
      "etablissement.acceder",
      "etablissement.configurer",
    ]),
    showEleves: hasAny([
      "eleves.inscrire",
      "eleves.dossiers",
      "eleves.consulter",
    ]),
    showEnseignants: hasAny([
      "enseignants.consulter",
      "enseignants.gerer",
    ]),
    showClasses: hasAny(["classes.consulter", "classes.gerer"]),
    showAbsences: hasAny(["absences.consulter", "absences.gerer"]),
    showPedagogie: hasAny([
      "notes.saisir",
      "notes.consulter",
      "bulletins.generer",
      "bulletins.valider",
      "bulletins.publier",
      "resultats.consulter",
    ]),
    showPaiements: hasAny([
      "paiements.enregistrer",
      "paiements.consulter",
      "paiements.valider",
      "paiements.suivre_retard",
      "paiements.historique",
    ]),
    showFinance: hasAny([
      "frais.consulter",
      "frais.gerer",
      "salaires.consulter",
      "salaires.gerer",
      "depenses.consulter",
      "depenses.gerer",
      "caisse.consulter",
      "caisse.gerer",
    ]),
    showDocuments: hasAny([
      "documents.bulletins",
      "documents.recus",
      "documents.cartes_scolaires",
      "documents.attestations",
      "documents.certificats",
      "documents.listes_classe",
      "documents.rapports",
    ]),
    showRapports: hasAny([
      "statistiques.pedagogie",
      "statistiques.finance",
      "rapports.financiers",
      "rapports.imprimer",
    ]),
    showUtilisateurs: hasAny([
      "utilisateurs.consulter",
      "utilisateurs.gerer",
    ]),

    can: {
      etablissementConfigurer: has("etablissement.configurer"),
      elevesInscrire: has("eleves.inscrire"),
      elevesDossiers: has("eleves.dossiers"),
      elevesConsulter: has("eleves.consulter"),
      enseignantsGerer: has("enseignants.gerer"),
      classesGerer: has("classes.gerer"),
      absencesGerer: has("absences.gerer"),
      notesSaisir: has("notes.saisir"),
      bulletinsGenerer: has("bulletins.generer"),
      bulletinsValider: has("bulletins.valider"),
      bulletinsPublier: has("bulletins.publier"),
      paiementsEnregistrer: has("paiements.enregistrer"),
      paiementsValider: has("paiements.valider"),
      fraisGerer: has("frais.gerer"),
      salairesGerer: has("salaires.gerer"),
      depensesGerer: has("depenses.gerer"),
      caisseGerer: has("caisse.gerer"),
      utilisateursGerer: has("utilisateurs.gerer"),
    },
  };
}

export type MenuAccess = ReturnType<typeof useMenuAccess>;
