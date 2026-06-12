import { Navigate } from "react-router-dom";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMenuAccess } from "@/hooks/useMenuAccess";
import { ROUTES } from "@/lib/constants";
import { MatieresTab } from "@/pages/etablissement/matieres/MatieresTab";
import { NotationParCycleTab } from "@/pages/etablissement/matieres/NotationParCycleTab";
import { SequencesTab } from "@/pages/etablissement/matieres/SequencesTab";

export function MatieresPage(): React.JSX.Element {
  const { can } = useMenuAccess();

  if (!can.etablissementConfigurer) {
    return <Navigate to={ROUTES.etablissementWizard} replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matières &amp; évaluation</h1>
        <p className="text-sm text-muted-foreground">
          Matières, séquences d&apos;évaluation et notation par cycle
        </p>
      </div>

      <Tabs defaultValue="matieres">
        <TabsList>
          <TabsTrigger value="matieres">Matières</TabsTrigger>
          <TabsTrigger value="sequences">Séquences d&apos;évaluation</TabsTrigger>
          <TabsTrigger value="notation">Notation par cycle</TabsTrigger>
        </TabsList>

        <TabsContent value="matieres" className="mt-4">
          <MatieresTab />
        </TabsContent>

        <TabsContent value="sequences" className="mt-4">
          <SequencesTab />
        </TabsContent>

        <TabsContent value="notation" className="mt-4">
          <NotationParCycleTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
