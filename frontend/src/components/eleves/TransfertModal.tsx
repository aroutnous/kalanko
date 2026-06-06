import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { FormModal } from "@/components/etablissement/FormModal";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { ELEVES_API } from "@/lib/eleves-api";
import { useToastStore } from "@/stores/toastStore";
import type { AnneeScolaire, Classe, Inscription } from "@/types";
import { useState } from "react";

interface TransfertModalProps {
  open: boolean;
  onClose: () => void;
  eleveId: string;
  currentClasseId?: string;
}

export function TransfertModal({
  open,
  onClose,
  eleveId,
  currentClasseId,
}: TransfertModalProps): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const [classeId, setClasseId] = useState("");

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get<Classe[]>(ETABLISSEMENT_API.classes);
      return data;
    },
    enabled: open,
  });

  const { data: anneeActive } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>(ETABLISSEMENT_API.anneeActive);
      return data;
    },
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Inscription>(ELEVES_API.transferer(eleveId), {
        classe_id: classeId,
        annee_scolaire_id: anneeActive?.id,
      });
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["eleve-dossier", eleveId] });
      void queryClient.invalidateQueries({ queryKey: ["eleves"] });
      toast("Élève transféré avec succès");
      setClasseId("");
      onClose();
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  const availableClasses = classes.filter((c) => c.id !== currentClasseId);

  return (
    <FormModal
      open={open}
      title="Transférer l'élève"
      onClose={() => {
        setClasseId("");
        onClose();
      }}
      onSubmit={() => mutation.mutate()}
      loading={mutation.isPending}
      submitLabel="Transférer"
    >
      <div className="space-y-2">
        <Label htmlFor="nouvelle_classe">Nouvelle classe *</Label>
        <Select
          id="nouvelle_classe"
          value={classeId}
          onChange={(e) => setClasseId(e.target.value)}
          required
        >
          <option value="">Sélectionner une classe</option>
          {availableClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nom}
            </option>
          ))}
        </Select>
      </div>
      {anneeActive ? (
        <p className="text-sm text-muted-foreground">
          Année scolaire : <strong>{anneeActive.libelle}</strong>
        </p>
      ) : null}
    </FormModal>
  );
}
