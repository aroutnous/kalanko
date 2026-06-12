export function displayCycleLabel(nom: string): string {
  if (nom === "Jardins d enfants") return "Jardins d'enfants";
  if (nom === "2eme Cycle") return "2ème Cycle";
  return nom;
}

export function formatBool(value: boolean): string {
  return value ? "Oui" : "Non";
}
