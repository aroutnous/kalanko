export const ENSEIGNANTS_API = {
  list: "/enseignants/",
  detail: (id: string) => `/enseignants/${id}`,
  parClasse: (classeId: string) => `/enseignants/classe/${classeId}`,
  parMatiere: (matiereId: string) => `/enseignants/matiere/${matiereId}`,
  matieres: (id: string) => `/enseignants/${id}/matieres`,
  matiere: (id: string, matiereId: string) =>
    `/enseignants/${id}/matieres/${matiereId}`,
  classes: (id: string) => `/enseignants/${id}/classes`,
  classe: (id: string, classeId: string) => `/enseignants/${id}/classes/${classeId}`,
} as const;
