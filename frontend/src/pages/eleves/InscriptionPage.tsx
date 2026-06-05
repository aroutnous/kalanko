import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { api, getErrorMessage } from "@/lib/api";
import { ROUTES } from "@/lib/constants";
import type { AnneeScolaire, Classe, Eleve } from "@/types";

interface InscriptionForm {
  nom: string;
  prenom: string;
  date_naissance: string;
  lieu_naissance: string;
  sexe: "" | "M" | "F";
  nom_parent: string;
  telephone_parent: string;
  adresse: string;
  classe_id: string;
  annee_scolaire_id: string;
}

const initialForm: InscriptionForm = {
  nom: "",
  prenom: "",
  date_naissance: "",
  lieu_naissance: "",
  sexe: "",
  nom_parent: "",
  telephone_parent: "",
  adresse: "",
  classe_id: "",
  annee_scolaire_id: "",
};

export function InscriptionPage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<InscriptionForm>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const { data: classes = [], isLoading: loadingClasses } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get<Classe[]>("/classes");
      return data;
    },
  });

  const { data: anneeActive, isLoading: loadingAnnee } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>("/annees-scolaires/active");
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!anneeActive) throw new Error("Aucune année scolaire active");
      const payload: Record<string, string | undefined> = {
        nom: form.nom,
        prenom: form.prenom,
        classe_id: form.classe_id,
        annee_scolaire_id: anneeActive.id,
        date_naissance: form.date_naissance || undefined,
        lieu_naissance: form.lieu_naissance || undefined,
        sexe: form.sexe || undefined,
        nom_parent: form.nom_parent || undefined,
        telephone_parent: form.telephone_parent || undefined,
        adresse: form.adresse || undefined,
      };
      const { data } = await api.post<{ eleve: Eleve }>("/eleves/inscrire", payload);
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["eleves"] });
      navigate(ROUTES.eleves);
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const update = (field: keyof InscriptionForm, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (loadingClasses || loadingAnnee) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      <PageHeader
        title="Inscrire un élève"
        description="Création du dossier et affectation à une classe"
        breadcrumb="Élèves"
      />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Informations élève</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              mutation.mutate();
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input id="nom" value={form.nom} onChange={(e) => update("nom", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="prenom">Prénom *</Label>
              <Input id="prenom" value={form.prenom} onChange={(e) => update("prenom", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date_naissance">Date de naissance</Label>
              <Input id="date_naissance" type="date" value={form.date_naissance} onChange={(e) => update("date_naissance", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sexe">Sexe</Label>
              <Select id="sexe" value={form.sexe} onChange={(e) => update("sexe", e.target.value)}>
                <option value="">—</option>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="lieu_naissance">Lieu de naissance</Label>
              <Input id="lieu_naissance" value={form.lieu_naissance} onChange={(e) => update("lieu_naissance", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nom_parent">Nom du parent</Label>
              <Input id="nom_parent" value={form.nom_parent} onChange={(e) => update("nom_parent", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telephone_parent">Téléphone parent</Label>
              <Input id="telephone_parent" value={form.telephone_parent} onChange={(e) => update("telephone_parent", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Input id="adresse" value={form.adresse} onChange={(e) => update("adresse", e.target.value)} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="classe_id">Classe *</Label>
              <Select id="classe_id" value={form.classe_id} onChange={(e) => update("classe_id", e.target.value)} required>
                <option value="">Sélectionner une classe</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </Select>
            </div>
            {anneeActive ? (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                Année scolaire active : <strong>{anneeActive.libelle}</strong>
              </p>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive sm:col-span-2" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Inscription…" : "Inscrire l'élève"}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate(ROUTES.eleves)}>
                Annuler
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
