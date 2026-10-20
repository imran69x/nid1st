"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { X, Sparkles, User, ArrowRight } from "lucide-react";

export function DailyWelcomeModal() {
  const { currentUser, isBlocked, showLockedModal } = useUserAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // If user is not logged in or account is locked, do not trigger daily welcome
    if (!currentUser || isBlocked || showLockedModal) {
      setIsOpen(false);
      return;
    }

    try {
      // Localized daily key (YYYY-MM-DD)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const todayKey = `${year}-${month}-${day}`;

      const userKey = currentUser.id || currentUser.username;
      const dailyStorageKey = `nid_daily_welcome_${userKey}`;
      const freshLoginKey = `nid_fresh_login_${userKey}`;

      const isFreshLogin = sessionStorage.getItem(freshLoginKey) === "true";
      const lastDailySeen = localStorage.getItem(dailyStorageKey);

      // Show popup if:
      // 1. User has logged in freshly (triggers every time they log in)
      // 2. OR user hasn't seen the popup today (daily morning welcome)
      if (isFreshLogin || lastDailySeen !== todayKey) {
        setIsOpen(true);
      }
    } catch {
      // Fallback if storage is unavailable
    }
  }, [currentUser, isBlocked, showLockedModal]);

  const handleDismiss = () => {
    try {
      if (currentUser) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const todayKey = `${year}-${month}-${day}`;

        const userKey = currentUser.id || currentUser.username;
        const dailyStorageKey = `nid_daily_welcome_${userKey}`;
        const freshLoginKey = `nid_fresh_login_${userKey}`;

        // Mark today as seen
        localStorage.setItem(dailyStorageKey, todayKey);
        // Clear fresh login flag for this session
        sessionStorage.removeItem(freshLoginKey);
      }
    } catch {
      // ignore
    }
    setIsOpen(false);
  };

  if (!isOpen || !currentUser || isBlocked || showLockedModal) {
    return null;
  }

  const displayName = currentUser.name || currentUser.username || "User";
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-200">
        {/* Top-Right X Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full bg-black/25 hover:bg-black/40 text-white flex items-center justify-center transition-colors shadow-xs"
          title="Close Popup"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Top Banner with Vibrant Gradient */}
        <div className="bg-gradient-to-tr from-brand-950 via-brand-850 to-indigo-900 pt-7 pb-12 px-6 text-center text-white relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-300 text-xs font-semibold backdrop-blur-xs mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Daily Welcome</span>
          </div>
          <p className="text-[11px] text-brand-100 font-medium">NID & Birth Smart Scanner</p>
        </div>

        {/* Round Profile Picture (Overlap between header and body) */}
        <div className="-mt-14 relative z-10 flex justify-center">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-white shadow-xl">
            {currentUser.profilePic ? (
              <img
                src={currentUser.profilePic}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 flex items-center justify-center text-white text-3xl font-extrabold uppercase shadow-inner">
                {initial}
              </div>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="pt-3 pb-6 px-6 text-center space-y-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              Welcome to <span className="text-brand-800">{displayName}</span>
            </h2>
            <div className="mt-1 flex items-center justify-center gap-1.5">
              <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                ID: {currentUser.username}
              </span>
              {currentUser.isAdmin ? (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Admin
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Member
                </span>
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600 font-bengali leading-relaxed">
            আজকের দিনে আপনাকে স্বাগতম! আপনার সকল এনআইডি ও জন্ম নিবন্ধন স্ক্যানিং কাজ সফল ও সুন্দর হোক।
          </div>

          {/* Continue / Action Button */}
          <button
            onClick={handleDismiss}
            className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-md shadow-brand-900/15 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
          >
            <span>চালিয়ে যান (Continue)</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
