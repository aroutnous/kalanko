import { NavLink, Outlet } from "react-router-dom";

import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useReportingAccess } from "@/hooks/useReportingAccess";

const ALL_TABS = [
  {
    to: ROUTES.rapportsTableauBord,
    label: "Tableau de bord",
    key: "canAccessTableauBord" as const,
  },
  {
    to: ROUTES.rapportsStatistiques,
    label: "Statistiques",
    key: "canAccessStatistiques" as const,
  },
  { to: ROUTES.rapportsExports, label: "Exports", key: "canAccessExports" as const },
  {
    to: ROUTES.rapportsImpressions,
    label: "Impressions",
    key: "canAccessImpressions" as const,
  },
];

export function ReportingLayout(): React.JSX.Element {
  const access = useReportingAccess();
  const tabs = ALL_TABS.filter((tab) => access[tab.key]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reporting & Documents</h1>
        <p className="text-sm text-muted-foreground">
          Statistiques, exports et impressions centralisées
        </p>
      </div>
      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
