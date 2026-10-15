"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUserAuth } from "@/lib/services/userAuthContext";
import {
  Menu,
  X,
  Scan,
  ShieldCheck,
  LogOut,
  User,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";

export function HeaderAndSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, logout } = useUserAuth();

  return (
    <>
      {/* Top Navbar: Clean, minimal, 3-line bar always visible */}
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 3-line hamburger menu - ALWAYS visible on all devices */}
            <button
              onClick={() => setIsOpen(true)}
              className="p-2 -ml-2 rounded-xl text-slate-700 hover:text-brand-900 hover:bg-slate-100 transition-colors focus:outline-none"
              title="Open Menu"
              aria-label="Open Menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-900 to-brand-700 flex items-center justify-center text-white shadow-sm">
                <Scan className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <span className="font-bold text-base sm:text-lg text-slate-900 tracking-tight">
                  NID & Birth Scanner
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Smart AI
                </span>
              </div>
            </Link>
          </div>

          {/* User Status / Quick Info */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1">
                    <User className="w-3.5 h-3.5 text-brand-700" />
                    {currentUser.username}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {isAdmin ? "System Administrator" : "Active Member"}
                  </div>
                </div>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-brand-800 hover:bg-brand-900 rounded-lg shadow-sm transition-all"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Slide-over Drawer / Sidebar - ALWAYS opens on click of 3-line bar */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-72 sm:w-80 bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-800 flex items-center justify-center text-white">
                  <Scan className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">NID Smart Scanner</h3>
                  <p className="text-[11px] text-slate-500">AI Document Parser</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Links */}
            <div className="p-3 flex-1 space-y-1">
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  pathname === "/"
                    ? "bg-brand-50 text-brand-900 font-semibold shadow-xs"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Scan className="w-4 h-4 text-brand-600" />
                <span>NID & Birth Scanner</span>
              </Link>

              {/* Admin Panel link - ONLY visible if currentUser.isAdmin is true */}
              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === "/admin"
                      ? "bg-indigo-50 text-indigo-900 font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-indigo-50/50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Admin Panel</span>
                </Link>
              )}
            </div>

            {/* User Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              {currentUser ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{currentUser.username}</div>
                      <div className="text-xs text-slate-500">
                        {isAdmin ? "Administrator" : "Standard User"}
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-brand-800 hover:bg-brand-900 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              )}

              {/* Developer Attribution with WhatsApp Link */}
              <div className="pt-2 border-t border-slate-200/60 text-center">
                <span className="text-[11px] text-slate-500 block">Developer:</span>
                <a
                  href="https://wa.me/8801706338181"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline mt-0.5"
                  title="Contact on WhatsApp: 01706338181"
                >
                  MD IMRAN HOSSAIN NOYON
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
