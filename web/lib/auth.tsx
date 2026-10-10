"use client";

import { Fragment, createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

export type Admin = { adminId: number; name: string; username: string; email: string; phone: string; avatar: string | null; createdAt: string; notifications: { securityAlerts: boolean; trafficAlerts: boolean; productUpdates: boolean } };
type Session = { remember: boolean; expiresAt: string };
type Registration = { name: string; username: string; email: string; password: string; confirmPassword: string; remember: boolean };
type Context = {
  admin: Admin | null; session: Session | null; ready: boolean; error: string;
  refresh: () => Promise<void>; setAdmin: (admin: Admin) => void;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (values: Registration) => Promise<void>;
  logout: () => Promise<void>; signedOut: (message?: string) => void;
};
const AuthContext = createContext<Context>(null!);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const refresh = useCallback(async () => {
    setError(""); setReady(false);
    try {
      const response = await fetch("/api/auth/me", { credentials: "include", cache: "no-store", signal: AbortSignal.timeout(25000) });
      if (response.status === 401) { setAdmin(null); setSession(null); return; }
      if (!response.ok) throw new Error();
      const data = await response.json(); setAdmin(data.admin); setSession(data.session);
    } catch { setError("Couldn’t connect to your account. Check the API and try again."); }
    finally { setReady(true); }
  }, []);
  useEffect(() => {
    localStorage.removeItem("qs_token"); localStorage.removeItem("qs_admin"); refresh();
    const expire = () => { setAdmin(null); setSession(null); router.replace("/login"); };
    window.addEventListener("qs:unauthorized", expire);
    return () => window.removeEventListener("qs:unauthorized", expire);
  }, [refresh, router]);

  function signedOut(message?: string) {
    setAdmin(null); setSession(null);
    if (message) sessionStorage.setItem("qs_notice", message);
    router.replace("/login");
  }
  async function authenticate(path: string, body: unknown) {
    await api(`/api/auth/${path}`, { method: "POST", body, auth: false });
    await refresh(); router.push("/dashboard");
  }
  const logout = async () => { await api("/api/auth/logout", { method: "POST" }); signedOut(); };
  return <AuthContext.Provider value={{ admin, session, ready, error, refresh, setAdmin, signedOut, logout,
    login: (email, password, remember) => authenticate("login", { email, password, remember }),
    register: values => authenticate("register", values),
  }}><Fragment key={admin?.adminId ?? "signed-out"}>{children}</Fragment></AuthContext.Provider>;
}
