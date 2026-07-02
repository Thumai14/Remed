import { createContext, useContext, useState, useCallback } from "react";
import { auth as authStore, api } from "../api.js";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(authStore.user);
  const isLoggedIn = !!authStore.token && !!user;

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    authStore.save(token, u);
    setUser(u);
    return u;
  }, []);

  const register = useCallback(async (data) => {
    const { token, user: u } = await api("/auth/register", {
      method: "POST",
      body: data,
    });
    authStore.save(token, u);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    authStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const billing = await api("/billing");
      if (billing && user) {
        const updated = { ...user, plan: billing.plan };
        authStore.save(authStore.token, updated);
        setUser(updated);
      }
    } catch { /* ignore */ }
  }, [user]);

  return (
    <AuthCtx.Provider value={{ user, isLoggedIn, login, register, logout, refreshUser }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
