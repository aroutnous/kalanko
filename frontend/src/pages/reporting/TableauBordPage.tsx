import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { FinanceChart, type FinanceChartDatum } from "@/components/finance/FinanceChart";
import { KpiGrid, type KpiItem } from "@/components/reporting/KpiGrid";
import { StatsChart } from "@/components/reporting/StatsChart";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import { FINANCE_API } from "@/lib/finance-api";
import { REPORTING_API } from "@/lib/reporting-api";
import { ETABLISSEMENT_API } from "@/lib/etablissement-api";
import type { AnneeScolaire, Paiement, StatistiquesGlobales, TableauBordResponse } from "@/types";

function monthKey(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    month: "short",
    year: "2-digit",
  });
}

export function TableauBordPage(): React.JSX.Element {
  const role = useAuthStore((s) => s.user?.role ?? "secretaire");

  const { data, isLoading } = useQuery({
    queryKey: ["reporting-tableau-bord"],
    queryFn: async () => {
      const { data: tb } = await api.get<TableauBordResponse>(REPORTING_API.tableauBord);
      return tb;
    },
  });

  const { data: anneeActive } = useQuery({
    queryKey: ["annee-active"],
    queryFn: async () => {
      const { data } = await api.get<AnneeScolaire>(ETABLISSEMENT_API.anneeActive);
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["stats-dashboard", anneeActive?.id],
    queryFn: async () => {
      const { data } = await api.get<StatistiquesGlobales>(REPORTING_API.statistiques, {
        params: { annee_id: anneeActive!.id },
      });
      return data;
    },
    enabled: Boolean(anneeActive?.id) && (role === "directeur" || role === "promoteur"),
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
    enabled: role === "promoteur" || role === "comptable",
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
    enabled: role === "comptable",
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

    if (role === "promoteur") {
      return [
        { label: "Élèves", value: String(d.nb_eleves ?? 0), color: "blue" },
        { label: "Classes", value: String(d.nb_classes ?? 0), color: "blue" },
        {
          label: "Taux paiement",
          value: `${Number(d.taux_paiement ?? 0).toFixed(1)} %`,
          color: "green",
        },
        {
          label: "CA du mois",
          value: `${Number(d.ca_mois ?? 0).toLocaleString("fr-FR")} FCFA`,
          color: "amber",
        },
      ];
    }

    if (role === "directeur") {
      return [
        {
          label: "Taux réussite",
          value: `${Number(d.taux_reussite ?? 0).toFixed(1)} %`,
          color: "green",
        },
        {
          label: "Bulletins validés",
          value: String(d.nb_bulletins_valides ?? 0),
          color: "blue",
        },
        { label: "Absences", value: String(d.nb_absences ?? 0), color: "red" },
      ];
    }

    if (role === "secretaire") {
      return [
        {
          label: "Inscriptions du jour",
          value: String(d.inscriptions_jour ?? 0),
          color: "blue",
        },
        {
          label: "Paiements du jour",
          value: String(d.paiements_jour ?? 0),
          color: "green",
        },
      ];
    }

    if (role === "comptable") {
      return [
        {
          label: "Recettes semaine",
          value: `${Number(d.recettes_semaine ?? 0).toLocaleString("fr-FR")} FCFA`,
          color: "green",
        },
        {
          label: "Dépenses semaine",
          value: `${Number(d.depenses_semaine ?? 0).toLocaleString("fr-FR")} FCFA`,
          color: "red",
        },
        {
          label: "Solde caisse",
          value: `${Number(d.solde_caisse ?? 0).toLocaleString("fr-FR")} FCFA`,
          color: "blue",
        },
      ];
    }

    return [];
  }, [data, role]);

  const topClasses = useMemo(() => {
    if (!stats) return [];
    return [...stats.eleves.par_classe]
      .sort((a, b) => b.effectif - a.effectif)
      .slice(0, 5)
      .map((c) => ({ label: c.nom, value: c.effectif }));
  }, [stats]);

  if (isLoading || !data) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <KpiGrid items={kpis} />

      {role === "promoteur" ? (
        <Card>
          <CardHeader>
            <CardTitle>Évolution mensuelle (recettes)</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart data={chartData} />
          </CardContent>
        </Card>
      ) : null}

      {role === "directeur" && topClasses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 classes (effectifs)</CardTitle>
          </CardHeader>
          <CardContent>
            <StatsChart type="bar" data={topClasses} valueLabel="Effectif" />
          </CardContent>
        </Card>
      ) : null}

      {role === "comptable" ? (
        <Card>
          <CardHeader>
            <CardTitle>Trésorerie</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceChart data={chartData} />
          </CardContent>
        </Card>
      ) : null}

      {role === "secretaire" ? (
        <Card>
          <CardHeader>
            <CardTitle>Actions récentes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              {Number(data.donnees.inscriptions_jour ?? 0)} inscription(s) et{" "}
              {Number(data.donnees.paiements_jour ?? 0)} paiement(s) enregistrés aujourd&apos;hui.
            </p>
            <p className="mt-2">
              Consultez le module Impressions pour les documents à générer.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
