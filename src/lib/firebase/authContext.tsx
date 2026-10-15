"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, isFirebaseConfigured, db } from "./config";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName?: string) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  guestMode: boolean;
  enableGuestMode: (email?: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isConfigured: false,
  signIn: async () => {},
  signUp: async () => {},
  logOut: async () => {},
  resetPassword: async () => {},
  guestMode: false,
  enableGuestMode: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    // Check if guest user was stored in local storage
    if (typeof window !== "undefined") {
      const storedGuest = localStorage.getItem("nid_scanner_guest_user");
      if (storedGuest) {
        setGuestMode(true);
        setUser(JSON.parse(storedGuest));
      }
    }

    if (!isFirebaseConfigured || !auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setGuestMode(false);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nid_scanner_guest_user");
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase credentials are not yet configured in .env.local. You can test using Guest Mode.");
    }
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUp = async (email: string, pass: string, displayName?: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase credentials are not yet configured in .env.local. You can test using Guest Mode.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && cred.user) {
      await updateProfile(cred.user, { displayName });
    }

    // Initialize user profile in Firestore
    if (db && cred.user) {
      try {
        await setDoc(doc(db, "users", cred.user.uid), {
          uid: cred.user.uid,
          email: cred.user.email,
          displayName: displayName || "",
          createdAt: serverTimestamp(),
          scanCount: 0,
        });
      } catch (err) {
        console.warn("Could not create user document in Firestore:", err);
      }
    }
  };

  const logOut = async () => {
    if (guestMode) {
      setGuestMode(false);
      setUser(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("nid_scanner_guest_user");
      }
      return;
    }

    if (auth) {
      await signOut(auth);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isFirebaseConfigured || !auth) {
      throw new Error("Firebase is not configured. Please add your credentials to .env.local");
    }
    await sendPasswordResetEmail(auth, email);
  };

  const enableGuestMode = (email = "guest.demo@nidscanner.bd") => {
    const mockUser: any = {
      uid: "guest_user_" + Math.random().toString(36).substring(2, 9),
      email,
      displayName: "Demo Operator",
    };
    setUser(mockUser);
    setGuestMode(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("nid_scanner_guest_user", JSON.stringify(mockUser));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isFirebaseConfigured,
        signIn,
        signUp,
        logOut,
        resetPassword,
        guestMode,
        enableGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
