export const PLATFORM_API = {
  tenants: "/platform/tenants",
  tenant: (id: string) => `/platform/tenants/${id}`,
  tenantUtilisateurs: (tenantId: string) =>
    `/platform/tenants/${tenantId}/utilisateurs`,
  tenantUtilisateur: (tenantId: string, userId: string) =>
    `/platform/tenants/${tenantId}/utilisateurs/${userId}`,
  tenantResetPassword: (tenantId: string, userId: string) =>
    `/platform/tenants/${tenantId}/utilisateurs/${userId}/reset-password`,
  tenantSuspendre: (id: string) => `/platform/tenants/${id}/suspendre`,
  tenantActiver: (id: string) => `/platform/tenants/${id}/activer`,
} as const;
