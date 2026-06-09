import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { StatutEnseignant } from "@/types";

export interface EnseignantFormValues {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  date_embauche: string;
  salaire_base: string;
  statut: StatutEnseignant;
}

interface EnseignantFormProps {
  values: EnseignantFormValues;
  onChange: (field: keyof EnseignantFormValues, value: string) => void;
  showStatut?: boolean;
  disabled?: boolean;
}

export function EnseignantForm({
  values,
  onChange,
  showStatut = false,
  disabled = false,
}: EnseignantFormProps): React.JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="nom">Nom *</Label>
          <Input
            id="nom"
            value={values.nom}
            onChange={(e) => onChange("nom", e.target.value)}
            required
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="prenom">Prénom *</Label>
          <Input
            id="prenom"
            value={values.prenom}
            onChange={(e) => onChange("prenom", e.target.value)}
            required
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          required
          disabled={disabled}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            value={values.telephone}
            onChange={(e) => onChange("telephone", e.target.value)}
            disabled={disabled}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date_embauche">Date d&apos;embauche</Label>
          <Input
            id="date_embauche"
            type="date"
            value={values.date_embauche}
            onChange={(e) => onChange("date_embauche", e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="adresse">Adresse</Label>
        <Input
          id="adresse"
          value={values.adresse}
          onChange={(e) => onChange("adresse", e.target.value)}
          disabled={disabled}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="salaire_base">Salaire de base (FCFA)</Label>
        <Input
          id="salaire_base"
          type="number"
          min="0"
          step="0.01"
          value={values.salaire_base}
          onChange={(e) => onChange("salaire_base", e.target.value)}
          disabled={disabled}
        />
      </div>
      {showStatut ? (
        <div className="space-y-2">
          <Label htmlFor="statut">Statut</Label>
          <Select
            id="statut"
            value={values.statut}
            onChange={(e) => onChange("statut", e.target.value)}
            disabled={disabled}
          >
            <option value="actif">Actif</option>
            <option value="inactif">Inactif</option>
            <option value="conge">Congé</option>
          </Select>
        </div>
      ) : null}
    </div>
  );
}

export const INITIAL_ENSEIGNANT_FORM: EnseignantFormValues = {
  nom: "",
  prenom: "",
  email: "",
  telephone: "",
  adresse: "",
  date_embauche: "",
  salaire_base: "0",
  statut: "actif",
};
