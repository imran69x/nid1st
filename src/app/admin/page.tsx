"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import {
  getAllUsers,
  createUserByAdmin,
  toggleUserBlockStatus,
  deleteUserByAdmin,
  updateSystemConfig,
  changeUserPassword,
} from "@/lib/services/userService";
import { DatabaseUser } from "@/types/user";
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock,
  Trash2,
  Power,
  Users,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  FileCheck2,
  ShieldAlert,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { currentUser, isAdmin, isLoading, systemConfig, refreshConfig } = useUserAuth();
  const router = useRouter();

  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // New user form state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  // Admin own password update state
  const [myNewPassword, setMyNewPassword] = useState("");
  const [updatingMyPassword, setUpdatingMyPassword] = useState(false);

  // Modal / Inline Password update for other users
  const [selectedUserForPass, setSelectedUserForPass] = useState<DatabaseUser | null>(null);
  const [targetUserNewPassword, setTargetUserNewPassword] = useState("");
  const [updatingTargetPassword, setUpdatingTargetPassword] = useState(false);

  // System config state
  const [scanningEnabled, setScanningEnabled] = useState(systemConfig.scanningEnabled);
  const [updatingConfig, setUpdatingConfig] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/");
      } else {
        loadUsers();
      }
    }
  }, [currentUser, isAdmin, isLoading, router]);

  useEffect(() => {
    setScanningEnabled(systemConfig.scanningEnabled);
  }, [systemConfig]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Please provide both User ID and password");
      return;
    }

    setCreating(true);
    try {
      await createUserByAdmin({
        username,
        password,
        isAdmin: newIsAdmin,
        isBlocked: false,
        scanCount: 0,
      });
      toast.success(`User '${username}' created successfully!`);
      setUsername("");
      setPassword("");
      setNewIsAdmin(false);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleBlock = async (user: DatabaseUser) => {
    if (user.username === "01706338181") {
      toast.error("You cannot block the main admin account!");
      return;
    }

    const nextState = !user.isBlocked;
    try {
      await toggleUserBlockStatus(user.id, nextState);
      toast.success(
        nextState
          ? `User '${user.username}' is now LOCKED/BLOCKED.`
          : `User '${user.username}' is now UNLOCKED/ACTIVE.`
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextState } : u))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  const handleDeleteUser = async (user: DatabaseUser) => {
    if (user.username === "01706338181") {
      toast.error("You cannot delete the main admin account!");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user '${user.username}'?`)) {
      return;
    }

    try {
      await deleteUserByAdmin(user.id);
      toast.success(`User '${user.username}' deleted.`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const handleToggleScanning = async () => {
    const nextVal = !scanningEnabled;
    setUpdatingConfig(true);
    try {
      await updateSystemConfig({ scanningEnabled: nextVal });
      setScanningEnabled(nextVal);
      await refreshConfig();
      toast.success(nextVal ? "সার্ভার চালু করা হয়েছে (Server ON)" : "সার্ভার বন্ধ করা হয়েছে (Server OFF)");
    } catch (err: any) {
      toast.error(err.message || "Failed to update system config");
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Change Admin's own password
  const handleChangeMyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myNewPassword.trim() || myNewPassword.trim().length < 3) {
      toast.error("Password must be at least 3 characters.");
      return;
    }

    setUpdatingMyPassword(true);
    try {
      await changeUserPassword("01706338181", myNewPassword.trim());
      toast.success("অ্যাডমিনের পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!");
      setMyNewPassword("");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to change admin password");
    } finally {
      setUpdatingMyPassword(false);
    }
  };

  // Change selected user's password
  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass || !targetUserNewPassword.trim()) return;

    setUpdatingTargetPassword(true);
    try {
      await changeUserPassword(selectedUserForPass.id, targetUserNewPassword.trim());
      toast.success(`'${selectedUserForPass.username}' এর পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!`);
      setSelectedUserForPass(null);
      setTargetUserNewPassword("");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setUpdatingTargetPassword(false);
    }
  };

  if (isLoading || !currentUser || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" /> Verifying Admin permissions...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm mb-1">
            <ShieldCheck className="w-5 h-5" /> Main Admin Control Panel
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            System & User Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Control authorized users, monitor scan usage, reset passwords, and toggle server operations.
          </p>
        </div>

        {/* Global Server/Scanning Feature Toggle */}
        <div className="flex items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-left">
            <div className="text-xs font-bold text-slate-800">সার্ভার স্ট্যাটাস (Server Status)</div>
            <div className="text-[11px] text-slate-500">
              {scanningEnabled ? "অনলাইন (ইউজাররা স্ক্যান করতে পারছে)" : "অফলাইন (সার্ভার বন্ধ রাখা হয়েছে)"}
            </div>
          </div>
          <button
            onClick={handleToggleScanning}
            disabled={updatingConfig}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              scanningEnabled
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-rose-600 text-white hover:bg-rose-700"
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {scanningEnabled ? "সার্ভার চালু (ON)" : "সার্ভার বন্ধ (OFF)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Create User & Admin Password Cards */}
        <div className="lg:col-span-1 space-y-6">
          {/* Create User Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-4">
              <UserPlus className="w-5 h-5 text-brand-700" />
              <span>Create User (নতুন ইউজার তৈরি)</span>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  User ID (ইউজার আইডি / মোবাইল)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 01712345678 or user1"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password (পাসওয়ার্ড)
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Admin Privileges</div>
                  <div className="text-[11px] text-slate-500">Can access this admin panel</div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create User
              </button>
            </form>
          </div>

          {/* Admin Change Own Password Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base mb-3">
              <KeyRound className="w-5 h-5 text-indigo-700" />
              <span>Change Admin Password</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              অ্যাডমিন অ্যাকাউন্ট (01706338181)-এর নতুন পাসওয়ার্ড সেট করুন।
            </p>

            <form onSubmit={handleChangeMyAdminPassword} className="space-y-3">
              <div>
                <input
                  type="text"
                  required
                  value={myNewPassword}
                  onChange={(e) => setMyNewPassword(e.target.value)}
                  placeholder="New Admin Password"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
                />
              </div>
              <button
                type="submit"
                disabled={updatingMyPassword}
                className="w-full py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {updatingMyPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Update Admin Password
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: User Management List with Scan Count */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
              <Users className="w-5 h-5 text-indigo-700" />
              <span>Database Users & Scan Records ({users.length})</span>
            </div>
            <button
              onClick={loadUsers}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loadingUsers ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loadingUsers ? (
            <div className="py-12 text-center text-slate-400 text-sm">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              No users found.
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {users.map((u) => {
                const isSelf = u.username === "01706338181";
                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm sm:text-base">
                          {u.username}
                        </span>
                        {u.isAdmin ? (
                          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-slate-100 text-slate-600">
                            User
                          </span>
                        )}
                        {isSelf && (
                          <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            (Main Admin)
                          </span>
                        )}
                      </div>

                      {/* User Info, Password & Scan Counter */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                        <span>
                          Password:{" "}
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">
                            {u.password || "••••••"}
                          </code>
                        </span>
                        <span>•</span>
                        {/* Scan Counter badge as requested */}
                        <span className="inline-flex items-center gap-1 font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                          <FileCheck2 className="w-3.5 h-3.5 text-brand-600" />
                          মোট স্ক্যান: {u.scanCount || 0} টি
                        </span>
                        <span>•</span>
                        <span>
                          {u.isBlocked ? (
                            <span className="font-bold text-rose-600 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked / Blocked
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons: Change Password, Lock/Block, Delete */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {/* Change Password button for any user */}
                      <button
                        onClick={() => {
                          setSelectedUserForPass(u);
                          setTargetUserNewPassword("");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-slate-200"
                        title="Change password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Change Pass</span>
                      </button>

                      {/* Lock / Block button */}
                      <button
                        onClick={() => handleToggleBlock(u)}
                        disabled={isSelf}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 ${
                          u.isBlocked
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        }`}
                        title={u.isBlocked ? "Unlock/Unblock user" : "Lock/Block user"}
                      >
                        {u.isBlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Lock / Block
                          </>
                        )}
                      </button>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={isSelf}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-30"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Change Password for Selected User */}
      {selectedUserForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-base mb-1">
              <KeyRound className="w-5 h-5" />
              <span>Change Password</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Set new password for <span className="font-bold text-slate-800">{selectedUserForPass.username}</span>
            </p>

            <form onSubmit={handleSaveUserPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={targetUserNewPassword}
                  onChange={(e) => setTargetUserNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPass(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingTargetPassword}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {updatingTargetPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
