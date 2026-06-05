import { Navigate, Outlet } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { ROUTES } from "@/lib/constants";
import { LoginPage } from "@/pages/auth/LoginPage";
import { DashboardPage } from "@/pages/dashboard/DashboardPage";
import { ElevesListPage } from "@/pages/eleves/ElevesListPage";
import { InscriptionPage } from "@/pages/eleves/InscriptionPage";
import { PaiementsPage } from "@/pages/finance/PaiementsPage";
import { useAuthStore } from "@/stores/authStore";

function PrivateRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />;
  }
  return <Outlet />;
}

function PublicRoute(): React.JSX.Element {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />;
  }
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [{ path: ROUTES.login, element: <LoginPage /> }],
  },
  {
    element: <PrivateRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: ROUTES.dashboard, element: <DashboardPage /> },
          { path: ROUTES.eleves, element: <ElevesListPage /> },
          { path: ROUTES.elevesInscrire, element: <InscriptionPage /> },
          { path: ROUTES.financePaiements, element: <PaiementsPage /> },
        ],
      },
    ],
  },
  {
    path: "/",
    element: (
      <Navigate
        to={useAuthStore.getState().isAuthenticated ? ROUTES.dashboard : ROUTES.login}
        replace
      />
    ),
  },
  { path: "*", element: <Navigate to={ROUTES.dashboard} replace /> },
]);
