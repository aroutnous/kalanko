export const REPORTING_API = {
  tableauBord: "/reporting/tableau-bord",
  statistiques: "/reporting/statistiques",
  exportRapportFinancier: "/reporting/exports/rapport-financier",
  exportResultatsClasse: "/reporting/exports/resultats-classe",
  impressionBulletin: (id: string) => `/reporting/impressions/bulletin/${id}`,
  impressionRecu: (id: string) => `/reporting/impressions/recu/${id}`,
  impressionListeClasse: (classeId: string) =>
    `/reporting/impressions/liste-classe/${classeId}`,
  impressionAttestation: (eleveId: string) =>
    `/reporting/impressions/attestation/${eleveId}`,
} as const;

export type FormatExport = "pdf" | "excel";
