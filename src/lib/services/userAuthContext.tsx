"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DatabaseUser, SystemConfig } from "@/types/user";
import {
  getActiveSession,
  loginWithDatabase,
  clearSession,
  getSystemConfig,
  ensureDefaultAdminExists,
} from "./userService";
import { useRouter } from "next/navigation";

interface UserAuthContextType {
  currentUser: DatabaseUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  systemConfig: SystemConfig;
  login: (username: string, pass: string) => Promise<DatabaseUser>;
  logout: () => void;
  refreshConfig: () => Promise<void>;
}

const UserAuthContext = createContext<UserAuthContextType>({
  currentUser: null,
  isLoading: true,
  isAdmin: false,
  systemConfig: { scanningEnabled: true },
  login: async () => {
    throw new Error("Context not ready");
  },
  logout: () => {},
  refreshConfig: async () => {},
});

export const useUserAuth = () => useContext(UserAuthContext);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DatabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ scanningEnabled: true });
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        await ensureDefaultAdminExists();
        const active = getActiveSession();
        if (active) {
          setCurrentUser(active);
        }
        const cfg = await getSystemConfig();
        setSystemConfig(cfg);
      } catch (err) {
        console.warn("Init session error:", err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  const login = async (username: string, pass: string): Promise<DatabaseUser> => {
    const user = await loginWithDatabase(username, pass);
    setCurrentUser(user);
    return user;
  };

  const logout = () => {
    clearSession();
    setCurrentUser(null);
    router.push("/login");
  };

  const refreshConfig = async () => {
    const cfg = await getSystemConfig();
    setSystemConfig(cfg);
  };

  return (
    <UserAuthContext.Provider
      value={{
        currentUser,
        isLoading,
        isAdmin: Boolean(currentUser?.isAdmin),
        systemConfig,
        login,
        logout,
        refreshConfig,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}
