import { NavLink, Outlet } from "react-router-dom";

import { ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePedagogieAccess } from "@/hooks/usePedagogieAccess";

const ALL_TABS = [
  {
    to: ROUTES.pedagogieNotes,
    label: "Saisie notes",
    accessKey: "canAccessNotes" as const,
  },
  {
    to: ROUTES.pedagogieBulletins,
    label: "Bulletins",
    accessKey: "canAccessBulletins" as const,
  },
  {
    to: ROUTES.pedagogieResultats,
    label: "Résultats",
    accessKey: "canAccessResultats" as const,
  },
  {
    to: ROUTES.pedagogieHistorique,
    label: "Historique",
    accessKey: "canAccessHistorique" as const,
  },
];

export function PedagogieLayout(): React.JSX.Element {
  const access = usePedagogieAccess();
  const tabs = ALL_TABS.filter((tab) => access[tab.accessKey]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Gestion pédagogique</h1>
        <p className="text-sm text-muted-foreground">
          Notes, bulletins et résultats de classe
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
