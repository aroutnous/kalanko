import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { useAuthStore } from "@/stores/authStore";
import "@/index.css";

useAuthStore.getState().hydrate();
if (useAuthStore.getState().isAuthenticated) {
  void useAuthStore.getState().fetchProfile().catch(() => {
    void useAuthStore.getState().logout();
  });
}

const root = document.getElementById("root");
if (!root) {
  throw new Error("Élément #root introuvable");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
