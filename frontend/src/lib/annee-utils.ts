/** Déduit les dates de début/fin à partir d'un libellé « 2024-2025 ». */
export function datesFromAnneeLibelle(libelle: string): {
  date_debut: string;
  date_fin: string;
} {
  const match = libelle.match(/^(\d{4})-(\d{4})$/);
  if (!match) {
    return { date_debut: "", date_fin: "" };
  }
  return {
    date_debut: `${match[1]}-09-01`,
    date_fin: `${match[2]}-06-30`,
  };
}
