"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { Scan, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useUserAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isBlockedError, setIsBlockedError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsBlockedError(false);
    setLoading(true);

    try {
      await login(username, password);
      router.push("/");
    } catch (err: any) {
      const msg = err.message || "Invalid credentials";
      setErrorMessage(msg);
      if (msg.toLowerCase().includes("locked") || msg.toLowerCase().includes("blocked")) {
        setIsBlockedError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200/80 shadow-card p-8 sm:p-10 relative">
        {/* Brand Icon */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-brand-900 to-brand-700 flex items-center justify-center text-white shadow-md mb-3">
            <Scan className="w-7 h-7 text-emerald-300" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            NID & Birth Scanner
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Database Authorized Access Portal
          </p>
        </div>

        {/* Locked / Blocked Alert */}
        {isBlockedError ? (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs">
              <div className="font-bold text-rose-900">Access Denied / Blocked</div>
              <div className="text-rose-700 mt-0.5">
                You are locked/blocked. Please contact our support team.
              </div>
            </div>
          </div>
        ) : errorMessage ? (
          <div className="mb-6 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            {errorMessage}
          </div>
        ) : null}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              User ID (ইউজার আইডি)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter User ID"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password (পাসওয়ার্ড)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-md shadow-brand-900/10 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Verifying..." : "Sign In (লগইন করুন)"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-[11px] text-slate-400">
            Authorized Personnel Only • Secure Access
          </p>
        </div>
      </div>
    </div>
  );
}
