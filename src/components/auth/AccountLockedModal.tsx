"use client";

import React from "react";
import { Lock, MessageCircle, LogOut, ShieldAlert } from "lucide-react";
import { useUserAuth } from "@/lib/services/userAuthContext";

export function AccountLockedModal() {
  const { currentUser, logout, showLockedModal, setShowLockedModal } = useUserAuth();

  // If the user is blocked or modal is flagged to show
  const isVisible = Boolean(currentUser?.isBlocked || showLockedModal);

  if (!currentUser || !isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-200 overflow-hidden transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Top Header with Icon */}
        <div className="bg-gradient-to-br from-rose-600 to-rose-700 px-6 pt-8 pb-7 text-center text-white relative">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 shadow-inner">
            <Lock className="w-8 h-8 text-white drop-shadow-sm animate-pulse" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">
            Account Locked (একাউন্ট লক)
          </h2>
          <p className="text-xs text-rose-100 font-medium mt-1">
            Access to scanner and system tools has been restricted
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 text-center space-y-5">
          <div className="bg-rose-50/80 rounded-2xl p-4 border border-rose-100 text-rose-900 space-y-1">
            <p className="text-sm font-bold">
              Your account is locked. Please contact developer.
            </p>
            <p className="text-xs text-rose-700 font-bengali">
              আপনার একাউন্টটি লক করা হয়েছে। কাজ করতে অনুগ্রহ করে ডেভেলপারের সাথে যোগাযোগ করুন।
            </p>
          </div>

          {/* Developer Contact Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
            <div className="text-xs text-slate-500 font-medium">Developer Details:</div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Developer: </span>
                <a
                  href="https://wa.me/8801706338181"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-sm text-emerald-700 hover:text-emerald-800 hover:underline transition-colors block sm:inline ml-1"
                  title="Click to chat on WhatsApp: 01706338181"
                >
                  MD IMRAN HOSSAIN NOYON
                </a>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                Available
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <a
              href="https://wa.me/8801706338181"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.01]"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Contact Developer on WhatsApp</span>
            </a>

            <button
              onClick={() => {
                logout();
              }}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / অন্য আইডি দিয়ে লগইন করুন</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
