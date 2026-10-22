"use client";

import React, { useEffect, useState } from "react";
import { Zap, ShieldCheck } from "lucide-react";

interface ActiveUser {
  id: string;
  name: string;
  profilePic?: string;
  dailyScanCount?: number;
  scanCount: number;
  totalScanCount?: number;
  isAdmin: boolean;
}

export function ActiveUsersTicker() {
  const [users, setUsers] = useState<ActiveUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/active-users");
      if (res.ok) {
        const data = await res.json();
        if (data.users && Array.isArray(data.users)) {
          setUsers(data.users);
        }
      }
    } catch {
      // ignore network errors gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const handleScanCompleted = () => {
      fetchUsers();
    };
    window.addEventListener("scanCompleted", handleScanCompleted);

    // Refresh every 20 seconds for live daily scan count updates
    const interval = setInterval(fetchUsers, 20000);
    return () => {
      window.removeEventListener("scanCompleted", handleScanCompleted);
      clearInterval(interval);
    };
  }, []);

  if (loading && users.length === 0) {
    return null;
  }

  if (users.length === 0) {
    return null;
  }

  // Duplicate items array so the marquee loop is completely seamless without any blank gaps
  const marqueeList = [...users, ...users, ...users];

  return (
    <div className="relative w-full bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white border-b border-brand-900/40 shadow-xs overflow-hidden select-none">
      <div className="max-w-7xl mx-auto flex items-center h-10 px-3 sm:px-4">
        {/* Left Fixed Badge: Active Members with Pulsing Dot */}
        <div className="shrink-0 z-10 flex items-center gap-2 pr-3 sm:pr-4 py-1 bg-gradient-to-r from-slate-900 via-slate-900 to-transparent">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
            <span>Active Users</span>
          </span>
          <span className="h-3.5 w-px bg-slate-700/80 mx-1 hidden sm:inline-block" />
        </div>

        {/* Scrolling Ticker Track */}
        <div className="relative flex-1 overflow-hidden">
          {/* Left subtle fade mask */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 z-1 bg-gradient-to-r from-slate-900 to-transparent" />

          {/* Marquee Content */}
          <div className="animate-marquee flex items-center gap-4 py-1">
            {marqueeList.map((user, idx) => {
              const initial = (user.name.charAt(0) || "U").toUpperCase();
              return (
                <div
                  key={`${user.id}_${idx}`}
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-xs transition-colors shrink-0 group cursor-default"
                >
                  {/* Round Profile Picture */}
                  <div className="relative shrink-0">
                    {user.profilePic ? (
                      <img
                        src={user.profilePic}
                        alt={user.name}
                        className="w-5 h-5 rounded-full object-cover ring-1 ring-emerald-500/70"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-[10px] ring-1 ring-emerald-500/70">
                        {initial}
                      </div>
                    )}
                    <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-1 ring-slate-900" />
                  </div>

                  {/* User Name */}
                  <span className="text-xs font-semibold text-slate-100 group-hover:text-emerald-300 transition-colors">
                    {user.name}
                  </span>

                  {/* Admin Tag */}
                  {user.isAdmin && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center gap-0.5">
                      <ShieldCheck className="w-2.5 h-2.5" /> Admin
                    </span>
                  )}

                  {/* Daily Scan Count Badge (Resets automatically to 0 on date change) */}
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 shadow-2xs"
                    title="Today's scans (Resets to 0 daily at 12:00 AM)"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>
                      {(user.dailyScanCount ?? user.scanCount) || 0}{" "}
                      {((user.dailyScanCount ?? user.scanCount) || 0) === 1 ? "Scan" : "Scans"}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Right subtle fade mask */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-1 bg-gradient-to-l from-slate-900 to-transparent" />
        </div>
      </div>
    </div>
  );
}
