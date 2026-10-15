"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/firebase/authContext";
import {
  Scan,
  LayoutDashboard,
  FileText,
  Settings,
  Shield,
  LogOut,
  LogIn,
  UserCheck,
  Menu,
  X,
  Sparkles,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logOut, guestMode, isConfigured } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "NID Scanner", href: "/scanner", icon: Scan },
    { name: "Saved Records", href: "/records", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Privacy Policy", href: "/privacy", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-900 to-brand-600 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
                <Scan className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 tracking-tight flex items-center gap-1.5">
                  NID Scanner <span className="text-xs px-1.5 py-0.5 rounded font-mono font-normal bg-brand-50 text-brand-700 border border-brand-200">BD</span>
                </span>
                <span className="block text-[11px] font-bengali text-slate-500 font-medium">স্মার্ট এনআইডি স্ক্যানার</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "bg-brand-50 text-brand-800 font-semibold shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Auth & Status area */}
          <div className="hidden md:flex items-center gap-3">
            {guestMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-500" /> Demo Mode
              </span>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {user.displayName || user.email?.split("@")[0] || "User"}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</div>
                </div>
                <button
                  onClick={() => logOut()}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-brand-800 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <LogIn className="w-4 h-4" /> Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-brand-800 hover:bg-brand-900 rounded-lg shadow-sm transition-all"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 pt-2 pb-5 space-y-1.5 shadow-lg">
          {guestMode && (
            <div className="px-3 py-1.5 mb-2 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium border border-amber-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Testing in Guest/Demo Mode
            </div>
          )}

          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive ? "bg-brand-50 text-brand-800 font-semibold" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-600" : "text-slate-400"}`} />
                {link.name}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                <div className="text-xs">
                  <div className="font-semibold text-slate-800">{user.email}</div>
                  <div className="text-[10px] text-slate-500">Authorized Session</div>
                </div>
                <button
                  onClick={() => {
                    logOut();
                    setMobileMenuOpen(false);
                  }}
                  className="px-3 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 text-sm font-medium text-white bg-brand-800 rounded-lg"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
