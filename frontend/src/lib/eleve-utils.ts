import type { Classe, DossierEleve, Inscription } from "@/types";

export function getActiveInscription(
  inscriptions: Inscription[],
): Inscription | undefined {
  return inscriptions.find((i) => i.statut === "inscrit");
}

export function resolveClasseNom(
  classeId: string | undefined,
  classes: Classe[],
): string {
  if (!classeId) return "—";
  return classes.find((c) => c.id === classeId)?.nom ?? "—";
}

export function getEleveClasseId(dossier: DossierEleve): string | undefined {
  return getActiveInscription(dossier.inscriptions)?.classe_id;
}
