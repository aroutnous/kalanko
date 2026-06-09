export type PermissionKey =
  | "eleves.read"
  | "eleves.write"
  | "eleves.delete"
  | "eleves.imprimer"
  | "enseignants.read"
  | "enseignants.write"
  | "classes.read"
  | "classes.write"
  | "absences.read"
  | "absences.write"
  | "notes.read"
  | "notes.write"
  | "bulletins.read"
  | "bulletins.write"
  | "bulletins.validate"
  | "bulletins.publish"
  | "bulletins.imprimer"
  | "paiements.read"
  | "paiements.write"
  | "paiements.validate"
  | "paiements.imprimer"
  | "frais.read"
  | "frais.write"
  | "salaires.read"
  | "salaires.write"
  | "depenses.read"
  | "depenses.write"
  | "rapports.read"
  | "rapports.imprimer"
  | "statistiques.read"
  | "utilisateurs.read"
  | "utilisateurs.write";

export interface PermissionItem {
  key: PermissionKey;
  label: string;
}

export interface PermissionGroup {
  title: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    title: "Élèves",
    permissions: [
      { key: "eleves.read", label: "Consulter les élèves" },
      { key: "eleves.write", label: "Gérer les élèves" },
      { key: "eleves.delete", label: "Supprimer un élève" },
      { key: "eleves.imprimer", label: "Imprimer documents élève" },
    ],
  },
  {
    title: "Enseignants",
    permissions: [
      { key: "enseignants.read", label: "Consulter les enseignants" },
      { key: "enseignants.write", label: "Gérer les enseignants" },
    ],
  },
  {
    title: "Classes",
    permissions: [
      { key: "classes.read", label: "Consulter les classes" },
      { key: "classes.write", label: "Gérer les classes" },
    ],
  },
  {
    title: "Absences",
    permissions: [
      { key: "absences.read", label: "Consulter les absences" },
      { key: "absences.write", label: "Gérer les absences" },
    ],
  },
  {
    title: "Notes & Bulletins",
    permissions: [
      { key: "notes.read", label: "Consulter les notes" },
      { key: "notes.write", label: "Saisir les notes" },
      { key: "bulletins.read", label: "Consulter les bulletins" },
      { key: "bulletins.write", label: "Gérer les bulletins" },
      { key: "bulletins.validate", label: "Valider les bulletins" },
      { key: "bulletins.publish", label: "Publier les bulletins" },
      { key: "bulletins.imprimer", label: "Imprimer les bulletins" },
    ],
  },
  {
    title: "Paiements",
    permissions: [
      { key: "paiements.read", label: "Consulter les paiements" },
      { key: "paiements.write", label: "Enregistrer les paiements" },
      { key: "paiements.validate", label: "Valider les paiements" },
      { key: "paiements.imprimer", label: "Imprimer les reçus" },
    ],
  },
  {
    title: "Finance",
    permissions: [
      { key: "frais.read", label: "Consulter les frais" },
      { key: "frais.write", label: "Gérer les frais" },
      { key: "salaires.read", label: "Consulter les salaires" },
      { key: "salaires.write", label: "Gérer les salaires" },
      { key: "depenses.read", label: "Consulter les dépenses" },
      { key: "depenses.write", label: "Gérer les dépenses" },
    ],
  },
  {
    title: "Rapports & Statistiques",
    permissions: [
      { key: "rapports.read", label: "Consulter les rapports" },
      { key: "rapports.imprimer", label: "Imprimer les rapports" },
      { key: "statistiques.read", label: "Voir les statistiques" },
    ],
  },
  {
    title: "Administration",
    permissions: [
      { key: "utilisateurs.read", label: "Consulter les utilisateurs" },
      { key: "utilisateurs.write", label: "Gérer les utilisateurs" },
    ],
  },
];

export const ALL_PERMISSION_KEYS: PermissionKey[] = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((p) => p.key),
);

export function formatPermissionCount(count: number): string {
  return count <= 1 ? `${count} permission` : `${count} permissions`;
}
