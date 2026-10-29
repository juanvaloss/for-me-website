import { useEffect, useMemo, useState, type ReactNode } from "react";

import { api } from "../api/endpoints";
import type { Profile } from "../api/types";
import { AuthContext, type AuthContextValue } from "./auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    api
      .session()
      .then(({ user: current }) => setUser(current), () => setUser(null))
      .finally(() => setIsReady(true));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isReady,
      login: async (payload) => {
        const profile = await api.login(payload);
        setUser(profile);
        return profile;
      },
      register: async (payload) => {
        const profile = await api.register(payload);
        setUser(profile);
        return profile;
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
      updateProfile: async (payload) => {
        const profile = await api.updateProfile(payload);
        setUser(profile);
        return profile;
      },
    }),
    [user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
