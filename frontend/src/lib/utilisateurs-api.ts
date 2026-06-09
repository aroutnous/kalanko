export const UTILISATEURS_API = {
  list: "/auth/utilisateurs",
  create: "/auth/utilisateurs",
  detail: (id: string) => `/auth/utilisateurs/${id}`,
  statut: (id: string) => `/auth/utilisateurs/${id}/statut`,
  resetPassword: (id: string) => `/auth/utilisateurs/${id}/reset-password`,
  permissions: (id: string) => `/auth/utilisateurs/${id}/permissions`,
  myPermissions: "/auth/me/permissions",
  changePassword: "/auth/change-password",
  me: "/auth/me",
} as const;

export const ROLES_CREATABLE: Array<"directeur" | "secretaire" | "comptable"> = [
  "directeur",
  "secretaire",
  "comptable",
];
