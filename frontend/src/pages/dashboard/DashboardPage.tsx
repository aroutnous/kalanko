import { useQuery } from "@tanstack/react-query";
import {
  Award,
  BookOpen,
  CreditCard,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { api, getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { TableauBordResponse } from "@/types";

function formatKpiValue(value: number | string): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return String(value);
}

function renderKpis(donnees: Record<string, number | string>): React.JSX.Element[] {
  const config: Record<
    string,
    { title: string; icon: React.ComponentType<{ className?: string }>; color: "blue" | "green" | "orange" | "purple" }
  > = {
    nb_eleves: { title: "Élèves inscrits", icon: Users, color: "blue" },
    nb_classes: { title: "Classes", icon: BookOpen, color: "purple" },
    taux_paiement: { title: "Taux de paiement (%)", icon: CreditCard, color: "green" },
    ca_mois: { title: "CA du mois (FCFA)", icon: Wallet, color: "orange" },
    taux_reussite: { title: "Taux de réussite (%)", icon: TrendingUp, color: "green" },
    nb_bulletins_valides: { title: "Bulletins validés", icon: Award, color: "blue" },
    nb_absences: { title: "Absences", icon: Users, color: "orange" },
    inscriptions_jour: { title: "Inscriptions aujourd'hui", icon: Users, color: "blue" },
    paiements_jour: { title: "Paiements aujourd'hui", icon: Wallet, color: "green" },
    recettes_semaine: { title: "Recettes semaine (FCFA)", icon: Wallet, color: "green" },
    depenses_semaine: { title: "Dépenses semaine (FCFA)", icon: CreditCard, color: "orange" },
    solde_caisse: { title: "Solde caisse (FCFA)", icon: Wallet, color: "purple" },
  };

  return Object.entries(donnees).map(([key, value]) => {
    const meta = config[key] ?? { title: key, icon: TrendingUp, color: "blue" as const };
    return (
      <StatCard
        key={key}
        title={meta.title}
        value={formatKpiValue(value)}
        icon={meta.icon}
        color={meta.color}
      />
    );
  });
}

export function DashboardPage(): React.JSX.Element {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery({
    queryKey: ["tableau-bord", user?.role],
    queryFn: async () => {
      const { data: response } = await api.get<TableauBordResponse>("/reporting/tableau-bord");
      return response;
    },
    retry: false,
  });

  return (
    <div>
      <PageHeader
        title="Tableau de bord"
        description="Indicateurs clés selon votre rôle"
        breadcrumb="Accueil"
      />
      {isLoading ? <LoadingSpinner /> : null}
      {error ? (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {getErrorMessage(error)} — certaines statistiques peuvent être indisponibles pour votre rôle.
        </p>
      ) : null}
      {data ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {renderKpis(data.donnees)}
        </div>
      ) : null}
    </div>
  );
}
