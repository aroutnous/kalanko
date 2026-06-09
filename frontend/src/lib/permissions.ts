export const PERMISSION_GROUPS = [
  {
    label: "Établissement",
    permissions: [
      { key: "etablissement.acceder", label: "Accéder à l'établissement" },
      { key: "etablissement.configurer", label: "Configurer l'établissement" },
    ],
  },
  {
    label: "Élèves",
    permissions: [
      { key: "eleves.inscrire", label: "Inscrire les élèves" },
      { key: "eleves.dossiers", label: "Gérer les dossiers élèves" },
      { key: "eleves.consulter", label: "Consulter les élèves" },
    ],
  },
  {
    label: "Enseignants",
    permissions: [
      { key: "enseignants.consulter", label: "Consulter les enseignants" },
      { key: "enseignants.gerer", label: "Gérer les enseignants" },
    ],
  },
  {
    label: "Classes",
    permissions: [
      { key: "classes.consulter", label: "Consulter les classes" },
      { key: "classes.gerer", label: "Gérer les classes" },
    ],
  },
  {
    label: "Absences",
    permissions: [
      { key: "absences.consulter", label: "Consulter les absences" },
      { key: "absences.gerer", label: "Gérer les absences" },
    ],
  },
  {
    label: "Pédagogie",
    permissions: [
      { key: "notes.saisir", label: "Saisir les notes" },
      { key: "notes.consulter", label: "Consulter les notes" },
      { key: "bulletins.generer", label: "Générer les bulletins" },
      { key: "bulletins.valider", label: "Valider les bulletins" },
      { key: "bulletins.publier", label: "Publier les bulletins" },
      { key: "resultats.consulter", label: "Consulter les résultats" },
    ],
  },
  {
    label: "Paiements",
    permissions: [
      { key: "paiements.enregistrer", label: "Enregistrer les paiements" },
      { key: "paiements.consulter", label: "Consulter les paiements" },
      { key: "paiements.valider", label: "Valider les paiements" },
      { key: "paiements.suivre_retard", label: "Suivre les paiements en retard" },
      { key: "paiements.historique", label: "Voir l'historique des paiements" },
    ],
  },
  {
    label: "Finance",
    permissions: [
      { key: "frais.consulter", label: "Consulter les frais scolaires" },
      { key: "frais.gerer", label: "Gérer les frais scolaires" },
      { key: "salaires.consulter", label: "Consulter les salaires" },
      { key: "salaires.gerer", label: "Gérer les salaires" },
      { key: "depenses.consulter", label: "Consulter les dépenses" },
      { key: "depenses.gerer", label: "Gérer les dépenses" },
      { key: "caisse.consulter", label: "Consulter la caisse" },
      { key: "caisse.gerer", label: "Gérer la caisse" },
    ],
  },
  {
    label: "Hub Documentaire",
    permissions: [
      { key: "documents.bulletins", label: "Imprimer les bulletins" },
      { key: "documents.recus", label: "Imprimer les reçus" },
      { key: "documents.cartes_scolaires", label: "Imprimer les cartes scolaires" },
      { key: "documents.attestations", label: "Imprimer les attestations" },
      { key: "documents.certificats", label: "Imprimer les certificats" },
      { key: "documents.listes_classe", label: "Imprimer les listes de classe" },
      { key: "documents.rapports", label: "Imprimer les rapports" },
    ],
  },
  {
    label: "Rapports & Statistiques",
    permissions: [
      { key: "statistiques.pedagogie", label: "Voir les statistiques pédagogiques" },
      { key: "statistiques.finance", label: "Voir les statistiques financières" },
      { key: "rapports.financiers", label: "Consulter les rapports financiers" },
      { key: "rapports.imprimer", label: "Imprimer les rapports" },
    ],
  },
  {
    label: "Utilisateurs",
    permissions: [
      { key: "utilisateurs.consulter", label: "Consulter les utilisateurs" },
      { key: "utilisateurs.gerer", label: "Gérer les utilisateurs" },
    ],
  },
] as const;

export type PermissionKey = string;

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((p) => p.key),
);

export function formatPermissionCount(count: number): string {
  return count <= 1 ? `${count} permission` : `${count} permissions`;
}
