"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, type User } from "./api";
import { isAdminRole, canAccess, type AdminSection } from "./admin-roles";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  canAdminAccess: (section: AdminSection) => boolean;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem("nouvil_token");
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await api.get<{ user: User }>("/auth/me");
      setUser(data.user);
    } catch {
      localStorage.removeItem("nouvil_token");
      localStorage.removeItem("nouvil_user");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ user: User; token: string }>("/auth/login", {
      email,
      password,
    });
    localStorage.setItem("nouvil_token", data.token);
    localStorage.setItem("nouvil_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (registerData: RegisterData) => {
    const data = await api.post<{ user: User; token: string }>(
      "/auth/register",
      registerData,
    );
    localStorage.setItem("nouvil_token", data.token);
    localStorage.setItem("nouvil_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout", {});
    } catch {}
    localStorage.removeItem("nouvil_token");
    localStorage.removeItem("nouvil_user");
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("nouvil_user", JSON.stringify(updatedUser));
  };

  const isAdmin = user ? isAdminRole(user.role) : false;
  const isSuperAdmin = user?.role === "super_admin" || user?.role === "admin";
  const canAdminAccess = (section: AdminSection) =>
    user ? canAccess(user.role, section) : false;

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, updateUser, isAdmin, isSuperAdmin, canAdminAccess }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
