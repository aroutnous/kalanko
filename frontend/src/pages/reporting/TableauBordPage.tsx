import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { FinanceChart, type FinanceChartDatum } from "@/components/finance/FinanceChart";
import { KpiGrid, type KpiItem } from "@/components/reporting/KpiGrid";
import { StatsChart } from "@/components/reporting/StatsChart";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
import { FINANCE_API } from "@/lib/finance-api";
import { REPORTING_API } from "@/lib/reporting-api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import { useHasPermission } from "@/hooks/useHasPermission";
import type { AnneeScolaire, Paiement, StatistiquesGlobales, TableauBordResponse } from "@/types";

function monthKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function TableauBordPage(): React.JSX.Element {
  const hasPermission = useHasPermission();

  const canStats =
    hasPermission("statistiques.pedagogie") ||
    hasPermission("statistiques.finance");

  const canViewReporting =
    hasPermission("rapports.financiers") || canStats;

  const canConsultPaiements = hasPermission("paiements.consulter");

  const { data, isLoading } = useQuery({
    queryKey: ["reporting-tableau-bord"],
    queryFn: async () => {
      const { data: tb } = await api.get<TableauBordResponse>(REPORTING_API.tableauBord);
      return tb;
    },
    enabled: canViewReporting,
    retry: false,
  });

  const { data: anneeActive } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>(ETABLISSEMENT_API.anneeActive);
      return data;
    },
    enabled: canStats,
  });

  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard", anneeActive?.id],
    queryFn: async () => {
      const { data } = await api.get<StatistiquesGlobales>(REPORTING_API.statistiques, {
        params: { annee_id: anneeActive!.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id) && canStats,
  });

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return d.toISOString().slice(0, 10);
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const { data: transactions = [] } = useQuery({
    queryKey: ["tb-transactions", sixMonthsAgo],
    queryFn: async () => {
      const { data } = await api.get<Paiement[]>(FINANCE_API.transactions, {
        params: { date_debut: sixMonthsAgo, date_fin: today },
      });
      return data;
    },
    enabled: canConsultPaiements || hasPermission("paiements.historique"),
  });

  const { data: depenses = [] } = useQuery({
    queryKey: ["tb-depenses", sixMonthsAgo],
    queryFn: async () => {
      const { data } = await api.get<{ date_depense: string; montant: number }[]>(
        FINANCE_API.depenses,
        { params: { date_debut: sixMonthsAgo, date_fin: today } },
      );
      return data;
    },
    enabled: hasPermission("depenses.consulter"),
  });

  const chartData = useMemo((): FinanceChartDatum[] => {
    const buckets = new Map<string, { recettes: number; depenses: number }>();
    for (const t of transactions.filter((x) => x.statut === "valide")) {
      const key = monthKey(t.date_paiement);
      const cur = buckets.get(key) ?? { recettes: 0, depenses: 0 };
      cur.recettes += Number(t.montant_paye);
      buckets.set(key, cur);
    }
    for (const d of depenses) {
      const key = monthKey(d.date_depense);
      const cur = buckets.get(key) ?? { recettes: 0, depenses: 0 };
      cur.depenses += Number(d.montant);
      buckets.set(key, cur);
    }
    return Array.from(buckets.entries()).map(([mois, vals]) => ({
      mois,
      recettes: vals.recettes,
      depenses: vals.depenses,
    }));
  }, [transactions, depenses]);

  const kpis = useMemo((): KpiItem[] => {
    if (!data) return [];
    const d = data.donnees;
    const items: KpiItem[] = [];

    if (hasPermission("eleves.consulter")) {
      items.push({ label: "Élèves", value: String(d.nb_eleves ?? 0), color: "blue" });
    }
    if (hasPermission("classes.consulter")) {
      items.push({ label: "Classes", value: String(d.nb_classes ?? 0), color: "blue" });
    }
    if (canConsultPaiements || canStats) {
      items.push({
        label: "Taux paiement",
        value: `${Number(d.taux_paiement ?? 0).toFixed(1)} %`,
        color: "green",
      });
      items.push({
        label: "CA du mois",
        value: `${Number(d.ca_mois ?? 0).toLocaleString("fr-FR")} FCFA`,
        color: "amber",
      });
    }
    if (canStats || hasPermission("notes.consulter")) {
      items.push({
        label: "Taux réussite",
        value: `${Number(d.taux_reussite ?? 0).toFixed(1)} %`,
        color: "green",
      });
    }
    if (
      hasPermission("bulletins.generer") ||
      hasPermission("bulletins.valider")
    ) {
      items.push({
        label: "Bulletins validés",
        value: String(d.nb_bulletins_valides ?? 0),
        color: "blue",
      });
    }
    if (hasPermission("absences.consulter")) {
      items.push({ label: "Absences", value: String(d.nb_absences ?? 0), color: "red" });
    }
    if (hasPermission("eleves.inscrire")) {
      items.push({
        label: "Inscriptions du jour",
        value: String(d.inscriptions_jour ?? 0),
        color: "blue",
      });
    }
    if (canConsultPaiements) {
      items.push({
        label: "Paiements du jour",
        value: String(d.paiements_jour ?? 0),
        color: "green",
      });
      items.push({
        label: "Recettes semaine",
        value: `${Number(d.recettes_semaine ?? 0).toLocaleString("fr-FR")} FCFA`,
        color: "green",
      });
      items.push({
        label: "Solde caisse",
        value: `${Number(d.solde_caisse ?? 0).toLocaleString("fr-FR")} FCFA`,
        color: "blue",
      });
    }
    if (hasPermission("depenses.consulter")) {
      items.push({
        label: "Dépenses semaine",
        value: `${Number(d.depenses_semaine ?? 0).toLocaleString("fr-FR")} FCFA`,
        color: "red",
      });
    }

    return items;
  }, [data, hasPermission, canConsultPaiements, canStats]);

  const topClasses = useMemo(() => {
    if (!stats) return [];
    return [...stats.eleves.par_classe]
      .sort((a, b) => b.effectif - a.effectif)
      .slice(0, 5)
      .map((c) => ({ label: c.nom, value: c.effectif }));
  }, [stats]);

  if (!canViewReporting) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun indicateur disponible pour vos permissions actuelles.
      </p>
    );
  }

  if (isLoading || !data) return <LoadingSpinner />;

  const canEnregistrerPaiements = hasPermission("paiements.enregistrer");
  const canInscrireEleves = hasPermission("eleves.inscrire");

  return (
    <div className="space-y-6">
      {kpis.length > 0 ? <KpiGrid items={kpis} /> : null}

      {canConsultPaiements && chartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle (recettes)</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart data={chartData} />
          </CardContent>
        </Card>
      ) : null}

      {canStats && topClasses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 classes (effectifs)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsChart type="bar" data={topClasses} valueLabel="Effectif" />
          </CardContent>
        </Card>
      ) : null}

      {hasPermission("depenses.consulter") && canConsultPaiements ? (
        <Card>
          <CardHeader>
            <CardTitle>Trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart data={chartData} />
          </CardContent>
        </Card>
      ) : null}

      {canInscrireEleves || canEnregistrerPaiements ? (
        <Card>
          <CardHeader>
            <CardTitle>Actions récentes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {canInscrireEleves ? (
              <p>{Number(data.donnees.inscriptions_jour ?? 0)} inscription(s) aujourd&apos;hui.</p>
            ) : null}
            {canEnregistrerPaiements ? (
              <p className="mt-2">
                {Number(data.donnees.paiements_jour ?? 0)} paiement(s) enregistrés aujourd&apos;hui.
              </p>
            ) : null}
            {hasPermission("rapports.imprimer") ? (
              <p className="mt-2">
                Consultez le Hub Documentaire pour les impressions.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
