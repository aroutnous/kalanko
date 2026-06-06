import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { DocumentsPanel } from "@/components/eleves/DocumentsPanel";
import { EleveCard } from "@/components/eleves/EleveCard";
import { TransfertModal } from "@/components/eleves/TransfertModal";
import { FormModal } from "@/components/etablissement/FormModal";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useElevesAccess } from "@/hooks/useElevesAccess";
import { api, getErrorMessage } from "@/lib/api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { ELEVES_API } from "@/lib/eleves-api";
import {
  getActiveInscription,
  getEleveClasseId,
  resolveClasseNom,
} from "@/lib/eleve-utils";
import { ROUTES } from "@/lib/constants";
import { useToastStore } from "@/stores/toastStore";
import type { Absence, AnneeScolaire, Classe, DossierEleve, Inscription } from "@/types";

export function EleveDossierPage(): React.JSX.Element {
  const { eleveId } = useParams<{ eleveId: string }>();
  const queryClient = useQueryClient();
  const toast = useToastStore((s) => s.show);
  const { canManage, canManageAbsences } = useElevesAccess();
  const [transferOpen, setTransferOpen] = useState(false);
  const [justifyOpen, setJustifyOpen] = useState(false);
  const [justifyMotif, setJustifyMotif] = useState("");
  const [selectedAbsence, setSelectedAbsence] = useState<Absence | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["eleve-dossier", eleveId],
    queryFn: async () => {
      const { data: dossier } = await api.get<DossierEleve>(
        ELEVES_API.dossier(eleveId!),
      );
      return dossier;
    },
    enabled: Boolean(eleveId),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data } = await api.get<Classe[]>(ETABLISSEMENT_API.classes);
      return data;
    },
  });

  const { data: annees = [] } = useQuery({
    queryKey: ["annees-scolaires"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire[]>(ETABLISSEMENT_API.annees);
      return data;
    },
  });

  const justifyMutation = useMutation({
    mutationFn: async ({ id, motif }: { id: string; motif: string }) => {
      const { data: absence } = await api.put<Absence>(
        ELEVES_API.justifierAbsence(id),
        { motif },
      );
      return absence;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["eleve-dossier", eleveId] });
      toast("Absence justifiée");
      setJustifyOpen(false);
      setJustifyMotif("");
      setSelectedAbsence(null);
    },
    onError: (err) => toast(getErrorMessage(err), "error"),
  });

  if (isLoading || !data || !eleveId) {
    return <LoadingSpinner />;
  }

  const activeInscription = getActiveInscription(data.inscriptions);
  const classeId = getEleveClasseId(data);
  const classeNom = resolveClasseNom(classeId, classes);

  const anneeMap = new Map(annees.map((a) => [a.id, a.libelle]));
  const classeMap = new Map(classes.map((c) => [c.id, c.nom]));

  const historiqueColumns: DataTableColumn<Inscription>[] = [
    {
      key: "annee",
      header: "Année",
      render: (r) => anneeMap.get(r.annee_scolaire_id) ?? r.annee_scolaire_id,
    },
    {
      key: "classe",
      header: "Classe",
      render: (r) => classeMap.get(r.classe_id) ?? r.classe_id,
    },
    { key: "date", header: "Date inscription", render: (r) => r.date_inscription },
    { key: "statut", header: "Statut", render: (r) => r.statut },
  ];

  const absenceColumns: DataTableColumn<Absence>[] = [
    { key: "date", header: "Date", render: (r) => r.date_absence },
    {
      key: "type",
      header: "Type",
      render: (r) => (
        <Badge variant={r.type === "absence" ? "warning" : "default"}>
          {r.type === "absence" ? "Absence" : "Retard"}
        </Badge>
      ),
    },
    {
      key: "justifiee",
      header: "Justifiée",
      render: (r) => (
        <Badge variant={r.justifiee ? "success" : "destructive"}>
          {r.justifiee ? "Oui" : "Non"}
        </Badge>
      ),
    },
    { key: "motif", header: "Motif", render: (r) => r.motif ?? "—" },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        !r.justifiee && canManageAbsences ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedAbsence(r);
              setJustifyOpen(true);
            }}
          >
            Justifier
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dossier élève"
        description="Informations, historique et documents"
        breadcrumb="Élèves"
        action={
          <div className="flex gap-2">
            {canManage ? (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Transférer
              </Button>
            ) : null}
            <Link to={ROUTES.eleves}>
              <Button variant="outline">Retour à la liste</Button>
            </Link>
          </div>
        }
      />

      <EleveCard eleve={data.eleve} classeNom={classeNom} />

      <Tabs defaultValue="informations">
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="historique">Historique scolaire</TabsTrigger>
          <TabsTrigger value="absences">
            Absences ({data.absences.length})
          </TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="informations">
          <Card>
            <CardHeader>
              <CardTitle>Données personnelles</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <p>
                <span className="font-medium">Date de naissance :</span>{" "}
                {data.eleve.date_naissance ?? "—"}
              </p>
              <p>
                <span className="font-medium">Lieu de naissance :</span>{" "}
                {data.eleve.lieu_naissance ?? "—"}
              </p>
              <p>
                <span className="font-medium">Sexe :</span>{" "}
                {data.eleve.sexe === "M"
                  ? "Masculin"
                  : data.eleve.sexe === "F"
                    ? "Féminin"
                    : "—"}
              </p>
              <p>
                <span className="font-medium">Adresse :</span>{" "}
                {data.eleve.adresse ?? "—"}
              </p>
              <p>
                <span className="font-medium">Parent :</span>{" "}
                {data.eleve.nom_parent ?? "—"}
              </p>
              <p>
                <span className="font-medium">Téléphone parent :</span>{" "}
                {data.eleve.telephone_parent ?? "—"}
              </p>
              {activeInscription ? (
                <p className="sm:col-span-2">
                  <span className="font-medium">Inscription active :</span>{" "}
                  {activeInscription.date_inscription} — {classeNom}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historique">
          <DataTable
            columns={historiqueColumns}
            data={data.inscriptions}
            page={1}
            pageSize={data.inscriptions.length || 1}
            total={data.inscriptions.length}
            onPageChange={() => {}}
            emptyMessage="Aucune inscription"
          />
        </TabsContent>

        <TabsContent value="absences">
          <DataTable
            columns={absenceColumns}
            data={data.absences}
            page={1}
            pageSize={data.absences.length || 1}
            total={data.absences.length}
            onPageChange={() => {}}
            emptyMessage="Aucune absence enregistrée"
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsPanel
            eleveId={eleveId}
            matricule={data.eleve.matricule}
            disabled={!canManage}
          />
        </TabsContent>
      </Tabs>

      {canManage ? (
        <TransfertModal
          open={transferOpen}
          onClose={() => setTransferOpen(false)}
          eleveId={eleveId}
          currentClasseId={classeId}
        />
      ) : null}

      <FormModal
        open={justifyOpen}
        title="Justifier l'absence"
        onClose={() => {
          setJustifyOpen(false);
          setJustifyMotif("");
          setSelectedAbsence(null);
        }}
        onSubmit={() => {
          if (!selectedAbsence || !justifyMotif.trim()) {
            toast("Le motif est obligatoire", "error");
            return;
          }
          justifyMutation.mutate({ id: selectedAbsence.id, motif: justifyMotif });
        }}
        loading={justifyMutation.isPending}
        submitLabel="Justifier"
      >
        <div className="space-y-2">
          <Label htmlFor="motif_justification">Motif *</Label>
          <Input
            id="motif_justification"
            value={justifyMotif}
            onChange={(e) => setJustifyMotif(e.target.value)}
            required
          />
        </div>
      </FormModal>
    </div>
  );
}
