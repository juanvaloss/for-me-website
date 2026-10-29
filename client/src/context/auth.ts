import { createContext, useContext } from "react";

import type {
  LoginPayload,
  Profile,
  ProfileUpdate,
  RegisterPayload,
} from "../api/types";

export interface AuthContextValue {
  user: Profile | null;
  isReady: boolean;
  login: (payload: LoginPayload) => Promise<Profile>;
  register: (payload: RegisterPayload) => Promise<Profile>;
  logout: () => Promise<void>;
  updateProfile: (payload: ProfileUpdate) => Promise<Profile>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return value;
}
