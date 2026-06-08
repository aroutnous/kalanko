import { Outlet } from "react-router-dom";

import { PlatformSidebar } from "@/components/layout/PlatformSidebar";

export function PlatformLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen bg-muted/30">
      <PlatformSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
