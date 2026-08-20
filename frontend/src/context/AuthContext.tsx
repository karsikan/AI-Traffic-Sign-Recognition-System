import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { AuthApi, TOKEN_KEY } from "@/services/api";
import type { Lang } from "@/types";

/**
 * Who is signed in.
 *
 * The token lives in localStorage and is attached to every request by the axios
 * interceptor in services/api.ts. On boot we do not trust the stored token — we ask the
 * backend who it belongs to, so a revoked or expired token fails immediately rather than
 * showing a signed-in shell that then 401s on every panel.
 */

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  preferred_language: Lang;
  created_at?: string;
  last_login_at?: string;
}

interface AuthCtx {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (d: { full_name: string; email: string; password: string; preferred_language: Lang }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    AuthApi.me()
      .then(setUser)
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  // The interceptor fires this when any request comes back 401
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener("auth:expired", onExpired);
    return () => window.removeEventListener("auth:expired", onExpired);
  }, []);

  const store = (res: { access_token: string; user: AuthUser }) => {
    localStorage.setItem(TOKEN_KEY, res.access_token);
    setUser(res.user);
  };

  const login: AuthCtx["login"] = async (email, password) => {
    store(await AuthApi.login(email, password));
  };

  const register: AuthCtx["register"] = async (d) => {
    store(await AuthApi.register(d));
  };

  const logout = () => {
    AuthApi.logout().catch(() => {});   // stateless server-side; failure is harmless
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  const refresh = async () => {
    try { setUser(await AuthApi.me()); } catch { setUser(null); }
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
