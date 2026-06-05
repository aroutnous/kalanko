export type RoleUtilisateur =
  | "platform_owner"
  | "promoteur"
  | "directeur"
  | "secretaire"
  | "comptable";

export type StatutUtilisateur = "actif" | "inactif";

export interface User {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  email: string;
  nom: string;
  prenom: string;
  role: RoleUtilisateur;
  statut: StatutUtilisateur;
  derniere_connexion: string | null;
}

export interface Tenant {
  slug: string;
  nom?: string;
}

export interface LoginPayload {
  tenant_slug: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  role: RoleUtilisateur;
  tenant_slug: string;
}

export interface Eleve {
  id: string;
  tenant_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  lieu_naissance: string | null;
  sexe: "M" | "F" | null;
  photo_url: string | null;
  nom_parent: string | null;
  telephone_parent: string | null;
  adresse: string | null;
  statut: string;
  created_at: string;
  updated_at: string | null;
}

export interface Classe {
  id: string;
  tenant_id: string;
  niveau_id: string;
  annee_scolaire_id: string;
  nom: string;
  capacite_max: number | null;
  created_at: string;
  updated_at: string | null;
}

export interface AnneeScolaire {
  id: string;
  tenant_id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  est_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface Note {
  id: string;
  eleve_id: string;
  matiere_id: string;
  periode_id: string;
  classe_id: string;
  valeur: number;
  appreciation: string | null;
}

export type ModePaiement = "especes" | "mobile_money" | "virement" | "cheque";

export interface Paiement {
  id: string;
  tenant_id: string;
  eleve_id: string;
  frais_id: string;
  annee_scolaire_id: string;
  montant_paye: number;
  mode_paiement: ModePaiement;
  reference_transaction: string | null;
  encaisse_par: string | null;
  date_paiement: string;
  statut: string;
  created_at: string;
  updated_at: string | null;
}

export interface FraisScolaire {
  id: string;
  libelle: string;
  montant: number;
  niveau_id: string;
  annee_scolaire_id: string;
}

export interface TableauBordResponse {
  tenant_id: string;
  role: RoleUtilisateur;
  generated_at: string;
  donnees: Record<string, number | string>;
}

export interface ApiError {
  detail: string | { msg: string }[];
}
