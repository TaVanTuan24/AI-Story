"use client";

import { createContext, useContext, useEffect, useState } from "react";

import type { MeResponse } from "@/lib/api/client";
import { api, ApiClientError } from "@/lib/api/client";
import {
  clearAuthStorage,
  readUser,
  writeUser,
  type StoredUser,
} from "@/lib/auth/storage";

type AuthContextValue = {
  token: string | null;
  user: StoredUser | null;
  preferences: MeResponse["preferences"] | null;
  isReady: boolean;
  isAuthenticated: boolean;
  setSession: (input: { token: string; user: StoredUser }) => void;
  refreshMe: () => Promise<void>;
  signOut: () => void;
  setPreferences: (preferences: MeResponse["preferences"]) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<StoredUser | null>(() => readUser());
  const [preferences, setPreferences] = useState<MeResponse["preferences"] | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    api.me()
      .then((result) => {
        setToken("session");
        setUser(result.user);
        setPreferences(result.preferences);
        writeUser(result.user);
      })
      .catch(() => {
        clearAuthStorage();
        setToken(null);
        setUser(null);
        setPreferences(null);
      })
      .finally(() => {
        setIsReady(true);
      });
  }, []);

  function setSession(input: { token: string; user: StoredUser }) {
    writeUser(input.user);
    setToken("session");
    setUser(input.user);
    void api.me("session").then((result) => {
      setPreferences(result.preferences);
      writeUser(result.user);
    });
  }

  async function refreshMe() {
    if (!token) {
      return;
    }

    try {
      const result = await api.me(token);
      setToken("session");
      setUser(result.user);
      setPreferences(result.preferences);
      writeUser(result.user);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        signOut();
      }
    }
  }

  function signOut() {
    void api.logout().finally(() => {
      clearAuthStorage();
      setToken(null);
      setUser(null);
      setPreferences(null);
    });
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        preferences,
        isReady,
        isAuthenticated: Boolean(token && user),
        setSession,
        refreshMe,
        signOut,
        setPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
