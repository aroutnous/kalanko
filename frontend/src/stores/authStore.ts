import { create } from "zustand";

import { api, clearAuthStorage, getStoredToken, setStoredToken } from "@/lib/api";
import { SESSION_KEYS } from "@/lib/constants";
import type { LoginPayload, LoginResponse, Tenant, User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  setUser: (user: User | null) => void;
  hydrate: () => void;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: getStoredToken(),
  tenant: sessionStorage.getItem(SESSION_KEYS.tenantSlug)
    ? { slug: sessionStorage.getItem(SESSION_KEYS.tenantSlug) ?? "" }
    : null,
  isAuthenticated: Boolean(getStoredToken()),

  hydrate: () => {
    const token = getStoredToken();
    const slug = sessionStorage.getItem(SESSION_KEYS.tenantSlug);
    set({
      token,
      isAuthenticated: Boolean(token),
      tenant: slug ? { slug } : null,
    });
  },

  login: async (payload) => {
    const { data } = await api.post<LoginResponse>("/auth/login", payload);
    setStoredToken(data.access_token);
    sessionStorage.setItem(SESSION_KEYS.tenantSlug, data.tenant_slug);
    set({
      token: data.access_token,
      tenant: { slug: data.tenant_slug },
      isAuthenticated: true,
    });
    await get().fetchProfile();
    return data;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      clearAuthStorage();
      set({ user: null, token: null, tenant: null, isAuthenticated: false });
    }
  },

  refreshToken: async () => {
    const { data } = await api.post<LoginResponse>("/auth/refresh");
    setStoredToken(data.access_token);
    set({ token: data.access_token, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  fetchProfile: async () => {
    const { data } = await api.get<User>("/auth/me");
    set({ user: data });
  },
}));
