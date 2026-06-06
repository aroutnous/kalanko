import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishmentAccess } from "@/hooks/useEstablishmentAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useToastStore } from "@/stores/toastStore";
import type { ConfigNotation } from "@/types";

interface ConfigForm {
  note_max: string;
  note_passage: string;
  arrondi: string;
}

export function ConfigNotationPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canEditConfig } = useEstablishmentAccess();
  const [form, setForm] = useState<ConfigForm>({
    note_max: "20",
    note_passage: "10",
    arrondi: "2",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["config-notation"],
    queryFn: async () => {
      const { data: config } = await api.get<ConfigNotation>(ETABLISSEMENT_API.configNotation);
      return config;
    },
  });

  useEffect(() => {
    if (data) {
      setForm({
        note_max: String(data.note_max),
        note_passage: String(data.note_passage),
        arrondi: String(data.arrondi),
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: ConfigForm) => {
      const { data: updated } = await api.put<ConfigNotation>(ETABLISSEMENT_API.configNotation, {
        note_max: payload.note_max,
        note_passage: payload.note_passage,
        arrondi: Number(payload.arrondi),
      });
      return updated;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["config-notation"] });
      toast("Configuration enregistrée");
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Configuration de la notation</h2>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Paramètres de notation</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canEditConfig) saveMutation.mutate(form);
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="note_max">Note maximale</Label>
              <Input
                id="note_max"
                type="number"
                min="1"
                step="0.01"
                value={form.note_max}
                onChange={(e) => setForm((p) => ({ ...p, note_max: e.target.value }))}
                disabled={!canEditConfig}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note_passage">Note de passage</Label>
              <Input
                id="note_passage"
                type="number"
                min="0"
                step="0.01"
                value={form.note_passage}
                onChange={(e) => setForm((p) => ({ ...p, note_passage: e.target.value }))}
                disabled={!canEditConfig}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="arrondi">Décimales (arrondi)</Label>
              <Input
                id="arrondi"
                type="number"
                min="0"
                max="4"
                value={form.arrondi}
                onChange={(e) => setForm((p) => ({ ...p, arrondi: e.target.value }))}
                disabled={!canEditConfig}
                required
              />
            </div>
            {canEditConfig ? (
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Lecture seule pour votre rôle.</p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
