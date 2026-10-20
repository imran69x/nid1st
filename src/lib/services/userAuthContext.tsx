"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { DatabaseUser, SystemConfig } from "@/types/user";
import {
  getActiveSession,
  loginWithDatabase,
  clearSession,
  saveSession,
  getSystemConfig,
  ensureDefaultAdminExists,
} from "./userService";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface UserAuthContextType {
  currentUser: DatabaseUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  isBlocked: boolean;
  showLockedModal: boolean;
  setShowLockedModal: (show: boolean) => void;
  systemConfig: SystemConfig;
  login: (username: string, pass: string) => Promise<DatabaseUser>;
  logout: () => void;
  refreshConfig: () => Promise<void>;
  updateUserLocalState: (updates: Partial<DatabaseUser>) => void;
}

const UserAuthContext = createContext<UserAuthContextType>({
  currentUser: null,
  isLoading: true,
  isAdmin: false,
  isBlocked: false,
  showLockedModal: false,
  setShowLockedModal: () => {},
  systemConfig: { scanningEnabled: true },
  login: async () => {
    throw new Error("Context not ready");
  },
  logout: () => {},
  refreshConfig: async () => {},
  updateUserLocalState: () => {},
});

export const useUserAuth = () => useContext(UserAuthContext);

export function UserAuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DatabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLockedModal, setShowLockedModal] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({ scanningEnabled: true });
  const router = useRouter();

  useEffect(() => {
    async function init() {
      try {
        await ensureDefaultAdminExists();
        const active = getActiveSession();
        if (active) {
          setCurrentUser(active);
          if (active.isBlocked) {
            setShowLockedModal(true);
          }
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

  const logout = useCallback(() => {
    clearSession();
    setCurrentUser(null);
    setShowLockedModal(false);
    router.push("/login");
  }, [router]);

  const updateUserLocalState = useCallback(
    (updates: Partial<DatabaseUser>) => {
      setCurrentUser((prev) => {
        if (!prev) return null;
        const updated = { ...prev, ...updates };
        saveSession(updated);
        return updated;
      });
    },
    []
  );

  // Background verification: detects real-time password changes & lock/block status
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    const verifyActiveSession = async () => {
      try {
        const queryParams = new URLSearchParams({
          userId: currentUser.id,
          pwTime: String(currentUser.passwordUpdatedAt || 0),
          _t: String(Date.now()),
        });

        const res = await fetch(`/api/auth/verify?${queryParams.toString()}`, {
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = await res.json();

        if (!isMounted) return;

        // Auto-logout if password was changed by admin or user deleted
        if (data.valid === false) {
          toast.error(
            data.message || "Your password was changed by admin. Please login again.",
            { id: "auth-invalid-logout", duration: 5000 }
          );
          clearSession();
          setCurrentUser(null);
          setShowLockedModal(false);
          router.push("/login");
          return;
        }

        // Sync real-time profile picture, name, block status, and permissions
        if (data.user) {
          const serverBlocked = Boolean(data.isBlocked);
          const picDiff = data.user.profilePic !== undefined && data.user.profilePic !== currentUser.profilePic;
          const nameDiff = data.user.name !== undefined && data.user.name !== currentUser.name;
          const blockDiff = serverBlocked !== Boolean(currentUser.isBlocked);
          const permDiff = Boolean(data.user.canDeleteRecent) !== Boolean(currentUser.canDeleteRecent);

          if (picDiff || nameDiff || blockDiff || permDiff) {
            const updated: DatabaseUser = {
              ...currentUser,
              name: data.user.name || currentUser.name,
              profilePic: data.user.profilePic !== undefined ? data.user.profilePic : currentUser.profilePic,
              profilePicChangedByUser: Boolean(data.user.profilePicChangedByUser),
              canDeleteRecent: Boolean(data.user.canDeleteRecent),
              isBlocked: serverBlocked,
              passwordUpdatedAt: data.user?.passwordUpdatedAt || currentUser.passwordUpdatedAt,
            };
            setCurrentUser(updated);
            saveSession(updated);

            if (serverBlocked) {
              setShowLockedModal(true);
            } else {
              setShowLockedModal(false);
            }
          }
        }
      } catch (err) {
        // Silently catch transient network errors
      }
    };

    // Run verification immediately
    verifyActiveSession();

    // Check periodically every 2.5 seconds
    const intervalId = setInterval(verifyActiveSession, 2500);

    const handleFocus = () => {
      verifyActiveSession();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
    };
  }, [currentUser?.id, currentUser?.passwordUpdatedAt, currentUser?.isBlocked, router]);

  const login = async (username: string, pass: string): Promise<DatabaseUser> => {
    const user = await loginWithDatabase(username, pass);
    setCurrentUser(user);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("nid_fresh_login_" + (user.id || user.username), "true");
    }
    if (user.isBlocked) {
      setShowLockedModal(true);
    } else {
      setShowLockedModal(false);
    }
    return user;
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
        isBlocked: Boolean(currentUser?.isBlocked),
        showLockedModal,
        setShowLockedModal,
        systemConfig,
        login,
        logout,
        refreshConfig,
        updateUserLocalState,
      }}
    >
      {children}
    </UserAuthContext.Provider>
  );
}
