/** URL de connexion dédiée à un tenant. */
export function buildTenantLoginUrl(slug: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/login/${encodeURIComponent(slug)}`;
}
