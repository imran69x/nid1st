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
  getRecentScans,
  deleteRecentScanRecord,
  deleteAllRecentScansForUser,
  toggleUserRecentDeletePermission,
  toggleAllUsersRecentDeletePermission,
  updateUserByAdmin,
  resizeImageToAvatar,
} from "@/lib/services/userService";
import { DatabaseUser, RecentScanRecord, ExtractedMember } from "@/types/user";
import {
  ShieldCheck,
  UserPlus,
  Lock,
  Unlock,
  Trash2,
  Power,
  Users,
  CheckCircle2,
  XCircle,
  RefreshCw,
  KeyRound,
  FileCheck2,
  ShieldAlert,
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  X,
  Search,
  Sliders,
  Eye,
  EyeOff,
  AlertTriangle,
  Edit,
  Camera,
  Upload,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { useRouter, useSearchParams } from "next/navigation";

type AdminTab = "users" | "create-user" | "recent-scans" | "permissions";

export default function AdminPage() {
  const { currentUser, isAdmin, isLoading, systemConfig, refreshConfig, updateUserLocalState } = useUserAuth();
  const router = useRouter();

  // Active Tab State (users | create-user | recent-scans | permissions)
  const [activeTab, setActiveTab] = useState<AdminTab>("users");

  // Sync tab with URL search parameter if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as AdminTab;
      if (tabParam && ["users", "create-user", "recent-scans", "permissions"].includes(tabParam)) {
        setActiveTab(tabParam);
      }
      const userParam = params.get("user");
      if (userParam) {
        setSelectedFilterUser(userParam);
      }
    }
  }, []);

  const switchTab = (tab: AdminTab, userFilter?: string) => {
    setActiveTab(tab);
    if (userFilter) {
      setSelectedFilterUser(userFilter);
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      if (userFilter) {
        url.searchParams.set("user", userFilter);
      } else {
        url.searchParams.delete("user");
      }
      window.history.replaceState(null, "", url.toString());
    }
  };

  // Users state
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Create User Form state
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);

  // Admin Own Password Update state
  const [myNewPassword, setMyNewPassword] = useState("");
  const [updatingMyPassword, setUpdatingMyPassword] = useState(false);

  // Target User Password Update Modal
  const [selectedUserForPass, setSelectedUserForPass] = useState<DatabaseUser | null>(null);
  const [targetUserNewPassword, setTargetUserNewPassword] = useState("");
  const [updatingTargetPassword, setUpdatingTargetPassword] = useState(false);

  // Edit User Modal State (Name, Username, Password, Profile Picture)
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<DatabaseUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editProfilePic, setEditProfilePic] = useState<string>("");
  const [resetPicLimit, setResetPicLimit] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(false);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);

  // System Settings state
  const [scanningEnabled, setScanningEnabled] = useState(systemConfig.scanningEnabled);
  const [allowUserDeleteRecent, setAllowUserDeleteRecent] = useState(
    Boolean(systemConfig.allowUserDeleteRecent)
  );
  const [hideRecentScans, setHideRecentScans] = useState(
    Boolean(systemConfig.hideRecentScans)
  );
  const [showActiveUsersTicker, setShowActiveUsersTicker] = useState(
    systemConfig.showActiveUsersTicker !== false
  );
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [updatingDeletePerm, setUpdatingDeletePerm] = useState(false);
  const [updatingHideRecent, setUpdatingHideRecent] = useState(false);
  const [updatingTicker, setUpdatingTicker] = useState(false);

  // Recent Scans Page State
  const [recentScans, setRecentScans] = useState<RecentScanRecord[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [selectedFilterUser, setSelectedFilterUser] = useState<string>("all");
  const [expandedScanId, setExpandedScanId] = useState<string | null>(null);
  const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
  const [deletingAllForUser, setDeletingAllForUser] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [updatingPermUserId, setUpdatingPermUserId] = useState<string | null>(null);
  const [updatingAllPerm, setUpdatingAllPerm] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!currentUser) {
        router.push("/login");
      } else if (!isAdmin) {
        router.push("/");
      } else {
        loadUsers();
        loadAllRecentScans();
      }
    }
  }, [currentUser, isAdmin, isLoading, router]);

  useEffect(() => {
    setScanningEnabled(systemConfig.scanningEnabled);
    setAllowUserDeleteRecent(Boolean(systemConfig.allowUserDeleteRecent));
    setHideRecentScans(Boolean(systemConfig.hideRecentScans));
    setShowActiveUsersTicker(systemConfig.showActiveUsersTicker !== false);
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

  const loadAllRecentScans = async () => {
    setLoadingRecent(true);
    try {
      const data = await getRecentScans(
        currentUser?.id || currentUser?.username || "",
        undefined,
        true
      );
      setRecentScans(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load recent scans");
    } finally {
      setLoadingRecent(false);
    }
  };

  // 1. Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("User ID এবং Password উভয় ফিল্ড পূরণ করুন");
      return;
    }

    setCreating(true);
    try {
      await createUserByAdmin({
        username: username.trim(),
        name: name.trim() || username.trim(),
        password: password.trim(),
        isAdmin: newIsAdmin,
        isBlocked: false,
        scanCount: 0,
      });
      toast.success(`User '${name.trim() || username}' তৈরি হয়েছে!`);
      setUsername("");
      setName("");
      setPassword("");
      setNewIsAdmin(false);
      await loadUsers();
      switchTab("users"); // Switch to users list to view newly created user
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setCreating(false);
    }
  };

  // 2. Toggle Block
  const handleToggleBlock = async (user: DatabaseUser) => {
    if (user.username === currentUser?.username && user.isAdmin) {
      toast.error("You cannot block your own admin account!");
      return;
    }

    const nextState = !user.isBlocked;
    try {
      await toggleUserBlockStatus(user.id, nextState);
      toast.success(
        nextState
          ? `User '${user.name || user.username}' is now LOCKED.`
          : `User '${user.name || user.username}' is now UNLOCKED.`
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isBlocked: nextState } : u))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update user status");
    }
  };

  // 3. Delete User
  const handleDeleteUser = async (user: DatabaseUser) => {
    if (user.username === currentUser?.username && user.isAdmin) {
      toast.error("You cannot delete your own admin account!");
      return;
    }

    if (!confirm(`Are you sure you want to permanently delete user '${user.name || user.username}'?`)) {
      return;
    }

    try {
      await deleteUserByAdmin(user.id);
      toast.success(`User '${user.name || user.username}' deleted.`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  // 4. Toggle Global Scanning Server
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

  // 5. Toggle User Delete Recent Permission (Option 4 requested)
  const handleToggleUserDeletePerm = async () => {
    const nextVal = !allowUserDeleteRecent;
    setUpdatingDeletePerm(true);
    try {
      await updateSystemConfig({ allowUserDeleteRecent: nextVal });
      setAllowUserDeleteRecent(nextVal);
      await refreshConfig();
      toast.success(
        nextVal
          ? "ইউজারদের ডিলিট অপশন চালু করা হয়েছে (ON - Users Can Delete)"
          : "ইউজারদের ডিলিট অপশন বন্ধ করা হয়েছে (OFF - Only Admin Can Delete)"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update permission");
    } finally {
      setUpdatingDeletePerm(false);
    }
  };

  // 5b. Toggle Individual User Delete Permission (Approve option next to each user)
  const handleToggleUserPermission = async (user: DatabaseUser, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const nextVal = !user.canDeleteRecent;
    setUpdatingPermUserId(user.id);
    try {
      await toggleUserRecentDeletePermission(user.id, nextVal);
      toast.success(
        nextVal
          ? `'${user.name || user.username}'-কে ডিলিট পারমিশন অনুমোদন দেওয়া হয়েছে!`
          : `'${user.name || user.username}'-এর ডিলিট পারমিশন বাতিল করা হয়েছে।`
      );
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, canDeleteRecent: nextVal } : u))
      );
    } catch (err: any) {
      toast.error(err.message || "পারমিশন পরিবর্তন করা যায়নি");
    } finally {
      setUpdatingPermUserId(null);
    }
  };

  // 5c. Toggle Permission for ALL Users at once (Admin option)
  const handleToggleAllPermissions = async (enable: boolean) => {
    setUpdatingAllPerm(true);
    try {
      await toggleAllUsersRecentDeletePermission(enable);
      toast.success(
        enable
          ? "সকল ইউজারকে রিসেন্ট স্ক্যান ডিলিট পারমিশন দেওয়া হয়েছে!"
          : "সকল ইউজারের ডিলিট পারমিশন বন্ধ করা হয়েছে।"
      );
      setUsers((prev) =>
        prev.map((u) => (u.isAdmin ? u : { ...u, canDeleteRecent: enable }))
      );
    } catch (err: any) {
      toast.error(err.message || "সকলের পারমিশন পরিবর্তন করা যায়নি");
    } finally {
      setUpdatingAllPerm(false);
    }
  };

  // 5d. Toggle Hide Recent Scans for regular users
  const handleToggleHideRecent = async () => {
    const nextVal = !hideRecentScans;
    setUpdatingHideRecent(true);
    try {
      await updateSystemConfig({ hideRecentScans: nextVal });
      setHideRecentScans(nextVal);
      await refreshConfig();
      toast.success(
        nextVal
          ? "ইউজারদের জন্য রিসেন্ট স্ক্যান বাটন লুকানো হয়েছে (Hidden from Users)"
          : "ইউজারদের জন্য রিসেন্ট স্ক্যান বাটন প্রদর্শন করা হয়েছে (Visible to Users)"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update recent visibility");
    } finally {
      setUpdatingHideRecent(false);
    }
  };

  // 5e. Toggle Active Users Ticker Bar visibility
  const handleToggleActiveUsersTicker = async () => {
    const nextVal = !showActiveUsersTicker;
    setUpdatingTicker(true);
    try {
      await updateSystemConfig({ showActiveUsersTicker: nextVal });
      setShowActiveUsersTicker(nextVal);
      await refreshConfig();
      toast.success(
        nextVal
          ? "অ্যাক্টিভ ইউজার বার চালু করা হয়েছে (ON - Active Users Bar Visible)"
          : "অ্যাক্টিভ ইউজার বার বন্ধ করা হয়েছে (OFF - Active Users Bar Hidden)"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update ticker setting");
    } finally {
      setUpdatingTicker(false);
    }
  };

  // 6. Admin Change Own Password
  const handleChangeMyAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myNewPassword.trim() || myNewPassword.trim().length < 3) {
      toast.error("Password must be at least 3 characters.");
      return;
    }

    setUpdatingMyPassword(true);
    try {
      const updatedUser = await changeUserPassword(currentUser?.id || currentUser?.username || "", myNewPassword.trim());
      if (updatedUser?.passwordUpdatedAt) {
        updateUserLocalState({ passwordUpdatedAt: updatedUser.passwordUpdatedAt });
      }
      toast.success("অ্যাডমিনের পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে!");
      setMyNewPassword("");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to change admin password");
    } finally {
      setUpdatingMyPassword(false);
    }
  };

  // 7. Change Selected User's Password
  const handleSaveUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass || !targetUserNewPassword.trim()) return;

    setUpdatingTargetPassword(true);
    try {
      await changeUserPassword(selectedUserForPass.id, targetUserNewPassword.trim());
      toast.success(`'${selectedUserForPass.name || selectedUserForPass.username}' এর পাসওয়ার্ড পরিবর্তিত হয়েছে!`);
      setSelectedUserForPass(null);
      setTargetUserNewPassword("");
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setUpdatingTargetPassword(false);
    }
  };

  // 7b. Open Edit User Modal (Name, Username, Password, Profile Picture)
  const openEditUserModal = (u: DatabaseUser) => {
    setSelectedUserForEdit(u);
    setEditName(u.name || u.username);
    setEditUsername(u.username);
    setEditPassword("");
    setEditProfilePic(u.profilePic || "");
    setResetPicLimit(false);
  };

  // Handle Photo Select in Edit Modal
  const handleEditFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("অনুগ্রহ করে একটি ছবি ফাইল নির্বাচন করুন");
      return;
    }
    try {
      const base64 = await resizeImageToAvatar(file);
      setEditProfilePic(base64);
    } catch {
      toast.error("ছবি প্রসেস করা সম্ভব হয়নি");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // Save Full User Edits
  const handleSaveUserEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    if (!editUsername.trim()) {
      toast.error("User ID খালি রাখা যাবে না");
      return;
    }

    setUpdatingUser(true);
    try {
      const updated = await updateUserByAdmin(selectedUserForEdit.id, {
        name: editName.trim(),
        username: editUsername.trim(),
        password: editPassword.trim() || undefined,
        profilePic: editProfilePic,
        resetPicChangeCount: resetPicLimit,
      });

      toast.success(`'${updated.name || updated.username}' সফলভাবে আপডেট হয়েছে!`);
      if (currentUser && (currentUser.id === updated.id || currentUser.username === updated.username)) {
        updateUserLocalState({
          name: updated.name,
          username: updated.username,
          profilePic: updated.profilePic,
        });
      }
      setSelectedUserForEdit(null);
      await loadUsers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setUpdatingUser(false);
    }
  };

  // 8. Delete Single Recent Scan Record
  const handleDeleteSingleScan = async (scanId: string) => {
    if (!confirm("Are you sure you want to delete this scan record?")) return;
    setDeletingScanId(scanId);
    try {
      await deleteRecentScanRecord(scanId, currentUser?.id || currentUser?.username || "");
      setRecentScans((prev) => prev.filter((s) => s.id !== scanId));
      toast.success("স্ক্যান রেকর্ড মুছে ফেলা হয়েছে");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete scan");
    } finally {
      setDeletingScanId(null);
    }
  };

  // 9. Delete All Recent Scans For Selected User
  const handleDeleteAllForUser = async (targetUserIdentifier: string, targetDisplayName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete ALL recent scan records for '${targetDisplayName}'? This cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingAllForUser(true);
    try {
      const count = await deleteAllRecentScansForUser(
        targetUserIdentifier,
        currentUser?.id || currentUser?.username || ""
      );
      setRecentScans((prev) =>
        prev.filter(
          (s) =>
            s.userId !== targetUserIdentifier &&
            s.username?.toLowerCase() !== targetUserIdentifier.toLowerCase()
        )
      );
      toast.success(`${count} টি স্ক্যান রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to delete all scans");
    } finally {
      setDeletingAllForUser(false);
    }
  };

  const copyField = (val: string, keyId: string) => {
    if (!val) {
      toast.error("Field is empty");
      return;
    }
    navigator.clipboard.writeText(val);
    setCopiedKey(keyId);
    toast.success("Copied!");
    setTimeout(() => {
      setCopiedKey((curr) => (curr === keyId ? null : curr));
    }, 1500);
  };

  const formatDate = (ts: number) => {
    if (!ts) return "";
    try {
      const d = new Date(ts);
      return d.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  // Filtered users for search
  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q))
    );
  });

  // Filtered recent scans by user
  const displayedRecentScans = recentScans.filter((s) => {
    if (selectedFilterUser === "all") return true;
    return (
      (s.userId && s.userId.toLowerCase() === selectedFilterUser.toLowerCase()) ||
      (s.username && s.username.toLowerCase() === selectedFilterUser.toLowerCase())
    );
  });

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-brand-800 font-semibold text-xs mb-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Main Administration Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Admin Control Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ম্যানেজ করুন ইউজার তালিকা, তৈরি করুন নতুন ইউজার, নিয়ন্ত্রণ করুন রিসেন্ট স্ক্যান ও পারমিশন।
          </p>
        </div>

        {/* Global Quick Info */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="text-xs font-bold text-slate-800">{currentUser.name || currentUser.username}</div>
            <div className="text-[10px] text-slate-500">Admin Account</div>
          </div>
          <button
            onClick={() => {
              loadUsers();
              loadAllRecentScans();
            }}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
            title="Refresh All Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4 DISTINCT NAVIGATION TABS AS REQUESTED */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-8 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80">
        {/* Tab 1: Database Users & Scan Records */}
        <button
          onClick={() => switchTab("users")}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "users"
              ? "bg-white text-brand-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Users className="w-4 h-4 text-brand-700 shrink-0" />
          <span className="truncate">1. Database Users ({users.length})</span>
        </button>

        {/* Tab 2: Create User */}
        <button
          onClick={() => switchTab("create-user")}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "create-user"
              ? "bg-white text-brand-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <UserPlus className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">2. Create User (নতুন ইউজার)</span>
        </button>

        {/* Tab 3: User Recent Scans */}
        <button
          onClick={() => switchTab("recent-scans")}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "recent-scans"
              ? "bg-white text-brand-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <History className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="truncate">3. User Recent Scans ({recentScans.length})</span>
        </button>

        {/* Tab 4: Recent Scan Permission & Settings */}
        <button
          onClick={() => switchTab("permissions")}
          className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === "permissions"
              ? "bg-white text-brand-900 shadow-sm border border-slate-200/80"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Sliders className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="truncate">4. Permissions & Settings</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PAGE 1: DATABASE USERS & SCAN RECORDS */}
      {/* ========================================================================= */}
      {activeTab === "users" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-700" />
              <div>
                <h2 className="text-base font-bold text-slate-900">Database Users & Scan Counter</h2>
                <p className="text-xs text-slate-500">মোট নিবন্ধিত ইউজার: {users.length} জন</p>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
              />
            </div>
          </div>

          {loadingUsers ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-brand-700" />
              ইউজার তালিকা লোড হচ্ছে...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
              কোন ইউজার পাওয়া যায়নি।
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
              {filteredUsers.map((u) => {
                const isSelf = u.username === currentUser?.username;
                const userScanCount = recentScans.filter(
                  (s) =>
                    (s.userId && s.userId.toLowerCase() === u.id.toLowerCase()) ||
                    (s.username && s.username.toLowerCase() === u.username.toLowerCase())
                ).length;

                return (
                  <div
                    key={u.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Round Profile Picture */}
                      <div className="relative shrink-0">
                        {u.profilePic ? (
                          <img
                            src={u.profilePic}
                            alt={u.name || u.username}
                            className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-bold text-base uppercase shadow-2xs">
                            {(u.name || u.username).charAt(0) || "U"}
                          </div>
                        )}
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                            u.isBlocked ? "bg-rose-500" : "bg-emerald-500"
                          }`}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm sm:text-base">
                            {u.name || u.username}
                          </span>
                          {u.name && u.name !== u.username && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              ID: {u.username}
                            </span>
                          )}
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

                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-xs text-slate-500">
                        <span>
                          Password:{" "}
                          <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono font-semibold">
                            {u.password || "••••••"}
                          </code>
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-bold text-brand-800 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200">
                          <FileCheck2 className="w-3.5 h-3.5 text-brand-600" />
                          মোট স্ক্যান: {u.scanCount || 0} টি
                        </span>
                        <span>•</span>
                        <span>
                          {u.isBlocked ? (
                            <span className="font-bold text-rose-600 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          ) : (
                            <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                      {/* View User Recent Scans Button (Switches to Tab 3 with this user preselected) */}
                      <button
                        onClick={() => {
                          switchTab("recent-scans", u.username);
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 text-brand-900 hover:bg-brand-100 border border-brand-200 transition-colors"
                        title="View user recent scans"
                      >
                        <History className="w-3.5 h-3.5 text-brand-700" />
                        <span>Recent ({userScanCount})</span>
                      </button>

                      {/* Approve / Revoke Recent Delete Permission */}
                      {!u.isAdmin && (
                        <button
                          onClick={(e) => handleToggleUserPermission(u, e)}
                          disabled={updatingPermUserId === u.id}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                            u.canDeleteRecent
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200"
                          }`}
                          title={
                            u.canDeleteRecent
                              ? "ডিলিট পারমিশন অনুমোদিত (ক্লিক করে বন্ধ করুন)"
                              : "ডিলিট পারমিশন নেই (ক্লিক করে অনুমোদন দিন)"
                          }
                        >
                          {updatingPermUserId === u.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : u.canDeleteRecent ? (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-600" />
                              <span>অনুমোদিত</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>অনুমোদন দিন</span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Edit User Button (Name, User ID, Password, Profile Picture) */}
                      <button
                        onClick={() => openEditUserModal(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
                        title="Edit Name, User ID, Password, and Profile Picture"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      {/* Change Password */}
                      <button
                        onClick={() => {
                          setSelectedUserForPass(u);
                          setTargetUserNewPassword("");
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border border-slate-200"
                        title="Change password"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Pass</span>
                      </button>

                      {/* Lock / Block */}
                      <button
                        onClick={() => handleToggleBlock(u)}
                        disabled={isSelf}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-30 ${
                          u.isBlocked
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                        }`}
                        title={u.isBlocked ? "Unlock user" : "Lock user"}
                      >
                        {u.isBlocked ? (
                          <>
                            <Unlock className="w-3.5 h-3.5" /> Unlock
                          </>
                        ) : (
                          <>
                            <Lock className="w-3.5 h-3.5" /> Lock
                          </>
                        )}
                      </button>

                      {/* Delete */}
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

          {/* Admin Change Own Password Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 max-w-lg mt-8">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm mb-2">
              <KeyRound className="w-4 h-4 text-indigo-700" />
              <span>Change Admin Account Password</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              অ্যাডমিন অ্যাকাউন্ট ({currentUser?.username})-এর নতুন পাসওয়ার্ড সেট করুন।
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
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
              >
                {updatingMyPassword ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                Update Admin Password
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 2: CREATE USER (নতুন ইউজার তৈরি) */}
      {/* ========================================================================= */}
      {activeTab === "create-user" && (
        <div className="max-w-xl mx-auto animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-2xl bg-brand-50 text-brand-800 flex items-center justify-center">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Create New User (নতুন ইউজার তৈরি)</h2>
                <p className="text-xs text-slate-500">ইউজারের আইডি, নাম ও পাসওয়ার্ড দিয়ে একাউন্ট তৈরি করুন</p>
              </div>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  User ID (লগইন আইডি / মোবাইল নম্বর) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. 01712345678 or user1"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  ইউজার এই আইডি দিয়ে সিস্টেমে লগইন করবে
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  User Name (ইউজার এর পূর্ণ নাম) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. মোঃ ইমরান হোসেন / Imran Hossain"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  লগইন করার পর উপরে এই নামটি প্রদর্শিত হবে
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password (লগইন পাসওয়ার্ড) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter Password"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50 text-slate-900"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-800">Admin Privileges (অ্যাডমিন পারমিশন)</div>
                  <div className="text-[11px] text-slate-500">এই ইউজার অ্যাডমিন প্যানেল এক্সেস করতে পারবে কিনা</div>
                </div>
                <input
                  type="checkbox"
                  checked={newIsAdmin}
                  onChange={(e) => setNewIsAdmin(e.target.checked)}
                  className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                নতুন ইউজার তৈরি করুন
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* PAGE 3: USER RECENT SCANS (ইউজারদের রিসেন্ট স্ক্যান ও রিমুভ) */}
      {/* ========================================================================= */}
      {activeTab === "recent-scans" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Filter & Bulk Actions Bar */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-700" />
                <h2 className="text-lg font-bold text-slate-900">User Recent Scan Records & Permissions</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ইউজারের নামে ক্লিক করে তার করা স্ক্যান সমূহ দেখুন এবং ডিলিট পারমিশন অনুমোদন দিন।
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleToggleHideRecent}
                disabled={updatingHideRecent}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs border ${
                  hideRecentScans
                    ? "bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-300"
                }`}
                title="ইউজারদের থেকে রিসেন্ট বাটন লুকান বা প্রদর্শন করুন"
              >
                {hideRecentScans ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                    <span>ইউজার রিসেন্ট: লুকানো (Hidden)</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>ইউজার রিসেন্ট: দৃশ্যমান (Visible)</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleToggleAllPermissions(true)}
                disabled={updatingAllPerm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
                title="সকল ইউজারকে রিসেন্ট স্ক্যান ডিলিট পারমিশন দিন"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>সকলকে পারমিশন দিন</span>
              </button>

              <button
                onClick={() => handleToggleAllPermissions(false)}
                disabled={updatingAllPerm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors shadow-2xs"
                title="সকল ইউজারের রিসেন্ট স্ক্যান ডিলিট পারমিশন বন্ধ করুন"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>সকলের পারমিশন বাতিল</span>
              </button>

              <button
                onClick={loadAllRecentScans}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200 transition-colors"
                title="Refresh Scans"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecent ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Users List with Name, Scan Count & Approve Toggle (4 cols) */}
            <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50/90 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-brand-700" />
                    ইউজার তালিকা ({users.length} জন)
                  </span>
                  <span className="text-[10px] text-slate-500">নামে ক্লিক করে স্ক্যান দেখুন</span>
                </div>
                <div className="relative mt-2">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="ইউজারের নাম বা আইডি দিয়ে খুঁজুন..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100 max-h-[680px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">কোন ইউজার পাওয়া যায়নি</div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedFilterUser.toLowerCase() === u.username.toLowerCase();
                    const uScansCount = recentScans.filter(
                      (s) =>
                        (s.userId && s.userId.toLowerCase() === u.id.toLowerCase()) ||
                        (s.username && s.username.toLowerCase() === u.username.toLowerCase())
                    ).length;
                    const isUpdatingPerm = updatingPermUserId === u.id;

                    return (
                      <div
                        key={u.id}
                        onClick={() => setSelectedFilterUser(u.username)}
                        className={`p-3.5 cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/80 border-l-4 border-indigo-700 shadow-2xs"
                            : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                                {u.name || u.username}
                              </span>
                              {u.isAdmin && (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-indigo-100 text-indigo-700">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                              <span className="font-mono text-[10px] text-slate-400">
                                ID: {u.username}
                              </span>
                              <span>•</span>
                              <span className="font-bold text-brand-800 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200">
                                {uScansCount} টি স্ক্যান
                              </span>
                            </div>
                          </div>

                          {/* APPROVE PERMISSION TOGGLE BUTTON NEXT TO USER NAME */}
                          <div className="shrink-0 flex items-center">
                            {u.isAdmin ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                                Admin (Full)
                              </span>
                            ) : (
                              <button
                                onClick={(e) => handleToggleUserPermission(u, e)}
                                disabled={isUpdatingPerm}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-2xs ${
                                  u.canDeleteRecent
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-300"
                                }`}
                                title={
                                  u.canDeleteRecent
                                    ? "পারমিশন সক্রিয় রয়েছে (ক্লিক করে বন্ধ করুন)"
                                    : "পারমিশন বন্ধ রয়েছে (ক্লিক করে অনুমোদন দিন)"
                                }
                              >
                                {isUpdatingPerm ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : u.canDeleteRecent ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>অনুমোদিত</span>
                                  </>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>অনুমোদন দিন</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Selected User's Scans (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Selected User Header Info Banner */}
              {(() => {
                const activeUserObj = users.find(
                  (u) => u.username.toLowerCase() === selectedFilterUser.toLowerCase()
                );
                return (
                  <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-extrabold text-slate-900">
                          {activeUserObj ? activeUserObj.name || activeUserObj.username : "সকল ইউজার"}
                        </span>
                        {activeUserObj && (
                          <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                            ID: {activeUserObj.username}
                          </span>
                        )}
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-brand-50 text-brand-900 border border-brand-200">
                          মোট {displayedRecentScans.length} টি স্ক্যান
                        </span>
                      </div>
                      {activeUserObj && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                          <span>রিসেন্ট স্ক্যান ডিলিট অনুমতি:</span>
                          {activeUserObj.isAdmin || activeUserObj.canDeleteRecent ? (
                            <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> পারমিশন দেওয়া আছে (Active)
                            </span>
                          ) : (
                            <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-flex items-center gap-1">
                              <Lock className="w-3 h-3" /> অনুমতি নেই (OFF)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedFilterUser !== "all" && displayedRecentScans.length > 0 && (
                        <button
                          onClick={() => {
                            handleDeleteAllForUser(
                              selectedFilterUser,
                              activeUserObj?.name || selectedFilterUser
                            );
                          }}
                          disabled={deletingAllForUser}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
                        >
                          {deletingAllForUser ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          <span>All Remove (সব মুছুন)</span>
                        </button>
                      )}
                      {selectedFilterUser !== "all" && (
                        <button
                          onClick={() => setSelectedFilterUser("all")}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-50"
                        >
                          সব দেখুন
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Scans List for Selected User */}
              {loadingRecent ? (
                <div className="py-20 text-center text-slate-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-700" />
                  রিসেন্ট স্ক্যান লোড হচ্ছে...
                </div>
              ) : displayedRecentScans.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">কোন রিসেন্ট স্ক্যান রেকর্ড পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedFilterUser === "all"
                      ? "ইউজাররা স্ক্যান করলে এখানে রেকর্ড প্রদর্শিত হবে।"
                      : `ইউজার '${selectedFilterUser}' এর কোন স্ক্যান রেকর্ড নেই।`}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayedRecentScans.map((rec) => {
                    const isExpanded = expandedScanId === rec.id;
                    const isDeleting = deletingScanId === rec.id;

                    return (
                      <div
                        key={rec.id}
                        className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
                      >
                        {/* Header Row */}
                        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-slate-900 text-base">
                                {rec.title}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {rec.totalMembers} জন সদস্য
                              </span>
                              {rec.userDisplayName && (
                                <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                                  ইউজার: {rec.userDisplayName} ({rec.username})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(rec.createdAt)}</span>
                            </div>
                          </div>

                          {/* Controls: View / Expand & Delete Single */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              onClick={() => setExpandedScanId(isExpanded ? null : rec.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{isExpanded ? "সংকুচিত করুন" : "বিস্তারিত দেখুন"}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={() => handleDeleteSingleScan(rec.id)}
                              disabled={isDeleting}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-200 transition-colors disabled:opacity-50"
                              title="Delete this scan"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              <span>মুছুন</span>
                            </button>
                          </div>
                        </div>

                        {/* Expanded Members View */}
                        {isExpanded && (
                          <div className="p-5 sm:p-6 border-t border-slate-100 space-y-6 bg-white animate-in fade-in duration-150">
                            {rec.members.map((m, mIdx) => (
                              <div
                                key={mIdx}
                                className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/40 space-y-4"
                              >
                                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                  <span className="font-bold text-sm text-slate-900">
                                    সদস্য {mIdx + 1} ({m.docType === "birth_certificate" ? "জন্ম নিবন্ধন" : "NID"}) - {m.nameEnglish || m.nameBangla || "Extracted"}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">নাম (বাংলা)</span>
                                    <div className="font-semibold text-slate-800 font-bengali truncate mt-0.5">{m.nameBangla || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">Name (English)</span>
                                    <div className="font-semibold text-slate-800 truncate mt-0.5">{m.nameEnglish || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">পিতার নাম (বাংলা)</span>
                                    <div className="font-semibold text-slate-800 font-bengali truncate mt-0.5">{m.fatherNameBangla || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">Father's Name (Eng)</span>
                                    <div className="font-semibold text-slate-800 truncate mt-0.5">{m.fatherNameEnglish || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">মাতার নাম (বাংলা)</span>
                                    <div className="font-semibold text-slate-800 font-bengali truncate mt-0.5">{m.motherNameBangla || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">Mother's Name (Eng)</span>
                                    <div className="font-semibold text-slate-800 truncate mt-0.5">{m.motherNameEnglish || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">NID / Birth Reg No</span>
                                    <div className="font-semibold text-slate-800 font-mono truncate mt-0.5">{m.nidNumber || "—"}</div>
                                  </div>
                                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                                    <span className="text-[10px] text-slate-400 block font-bold">Date of Birth</span>
                                    <div className="font-semibold text-slate-800 truncate mt-0.5">{m.dateOfBirth || "—"}</div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PAGE 4: RECENT SCAN PERMISSION & SYSTEM CONFIG */}
      {/* ========================================================================= */}
      {activeTab === "permissions" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-amber-600" />
              <span>Permissions & System Configuration</span>
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              রিসেন্ট স্ক্যান ডিলিট পারমিশন ও গ্লোবাল সার্ভার অ্যাক্টিভেশন সেটিংস কনফিগার করুন।
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: User Recent Delete Permission (Requested Feature) */}
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${
                    allowUserDeleteRecent ? "bg-emerald-600" : "bg-slate-700"
                  }`}>
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      ইউজারদের রিসেন্ট স্ক্যান ডিলিট পারমিশন
                    </h3>
                    <p className="text-[11px] text-slate-500">User Recent Scan Delete Control</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    বর্তমান অবস্থা:{" "}
                    {allowUserDeleteRecent ? (
                      <span className="text-emerald-700 font-extrabold">অন (ON) - ইউজাররা মুছতে পারবে</span>
                    ) : (
                      <span className="text-rose-700 font-extrabold">অফ (OFF) - শুধুমাত্র অ্যাডমিন মুছতে পারবে</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {allowUserDeleteRecent
                      ? "ইউজাররা তাদের রিসেন্ট স্ক্যান পেজ থেকে নিজের স্ক্যান রেকর্ড ডিলিট করতে পারছে।"
                      : "ইউজারদের ডিলিট অপশন বন্ধ আছে। শুধুমাত্র অ্যাডমিন প্যানেল থেকেই স্ক্যান রেকর্ড মোছা সম্ভব।"}
                  </div>
                </div>

                <button
                  onClick={handleToggleUserDeletePerm}
                  disabled={updatingDeletePerm}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                    allowUserDeleteRecent
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {updatingDeletePerm ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : allowUserDeleteRecent ? (
                    <>
                      <Lock className="w-4 h-4" />
                      ইউজার ডিলিট অপশন বন্ধ করুন (Turn OFF)
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      ইউজারদের ডিলিট অনুমতি দিন (Turn ON)
                    </>
                  )}
                </button>
              </div>

              {/* Card 2: Server Status Toggle */}
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${
                    scanningEnabled ? "bg-emerald-600" : "bg-rose-600"
                  }`}>
                    <Power className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      সার্ভার স্ক্যানিং স্ট্যাটাস (Server Status)
                    </h3>
                    <p className="text-[11px] text-slate-500">Global Scanning Service Switch</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    বর্তমান অবস্থা:{" "}
                    {scanningEnabled ? (
                      <span className="text-emerald-700 font-extrabold">অনলাইন (ON)</span>
                    ) : (
                      <span className="text-rose-700 font-extrabold">অফলাইন (OFF - সার্ভার বন্ধ)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {scanningEnabled
                      ? "সার্ভার চালু রয়েছে। ইউজাররা এনআইডি ও জন্ম নিবন্ধন স্ক্যান করতে পারছে।"
                      : "সার্ভার বন্ধ রাখা হয়েছে। ইউজাররা বর্তমানে নতুন কোনো ডকুমেন্ট স্ক্যান করতে পারবে না।"}
                  </div>
                </div>

                <button
                  onClick={handleToggleScanning}
                  disabled={updatingConfig}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                    scanningEnabled
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {updatingConfig ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : scanningEnabled ? (
                    <>
                      <Power className="w-4 h-4" />
                      সার্ভার বন্ধ করুন (Turn OFF)
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      সার্ভার চালু করুন (Turn ON)
                    </>
                  )}
                </button>
              </div>

              {/* Card 3: Hide / Show Recent Scans for Regular Users */}
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${
                      hideRecentScans ? "bg-amber-600" : "bg-indigo-600"
                    }`}
                  >
                    {hideRecentScans ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      ইউজারদের রিসেন্ট বাটন হাইড / প্রদর্শন
                    </h3>
                    <p className="text-[11px] text-slate-500">Hide / Show Recent for Users</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    বর্তমান অবস্থা:{" "}
                    {hideRecentScans ? (
                      <span className="text-amber-700 font-extrabold">লুকানো (HIDDEN - ইউজার দেখবে না)</span>
                    ) : (
                      <span className="text-emerald-700 font-extrabold">দৃশ্যমান (VISIBLE - ইউজার দেখবে)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {hideRecentScans
                      ? "সাধারণ ইউজারদের জন্য হেডার ও সাইডবার থেকে রিসেন্ট স্ক্যান বাটন লুকানো রয়েছে।"
                      : "সাধারণ ইউজাররা হেডার এবং সাইডবারে রিসেন্ট স্ক্যান বাটন স্বাভাবিকভাবে দেখতে পারছে।"}
                  </div>
                </div>

                <button
                  onClick={handleToggleHideRecent}
                  disabled={updatingHideRecent}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                    hideRecentScans
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                >
                  {updatingHideRecent ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : hideRecentScans ? (
                    <>
                      <Eye className="w-4 h-4" />
                      ইউজারদের বাটন দেখান (Show Recent)
                    </>
                  ) : (
                    <>
                      <EyeOff className="w-4 h-4" />
                      ইউজারদের থেকে বাটন লুকান (Hide Recent)
                    </>
                  )}
                </button>
              </div>

              {/* Card 4: Active Users Ticker Bar Toggle (Requested Feature) */}
              <div className="p-6 rounded-3xl border border-slate-200 bg-slate-50/70 space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shadow-xs ${
                      showActiveUsersTicker ? "bg-emerald-600" : "bg-slate-700"
                    }`}
                  >
                    <Zap className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                      অ্যাক্টিভ ইউজার নোটিফিকেশন বার (Active Users Bar)
                    </h3>
                    <p className="text-[11px] text-slate-500">Show / Hide Live Active Users Ticker Bar</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-1">
                  <div className="font-bold text-slate-800">
                    বর্তমান অবস্থা:{" "}
                    {showActiveUsersTicker ? (
                      <span className="text-emerald-700 font-extrabold">চালু (ON - দৃশ্যমান)</span>
                    ) : (
                      <span className="text-rose-700 font-extrabold">বন্ধ (OFF - সম্পূর্ণ লুকানো)</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 leading-relaxed">
                    {showActiveUsersTicker
                      ? "হেডারের নিচে অ্যাক্টিভ ইউজারদের প্রোফাইল ছবি ও স্ক্যান কাউন্টের স্ক্রলিং নোটিফিকেশন চালু রয়েছে।"
                      : "অ্যাক্টিভ ইউজার স্ক্রলিং টিকার বারটি বন্ধ রাখা হয়েছে (কাউকে দেখানো হবে না)।"}
                  </div>
                </div>

                <button
                  onClick={handleToggleActiveUsersTicker}
                  disabled={updatingTicker}
                  className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                    showActiveUsersTicker
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  {updatingTicker ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : showActiveUsersTicker ? (
                    <>
                      <Power className="w-4 h-4" />
                      বারটি বন্ধ করুন (Turn OFF Bar)
                    </>
                  ) : (
                    <>
                      <Power className="w-4 h-4" />
                      বারটি চালু করুন (Turn ON Bar)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Individual User Permissions Table (Approve per user) */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-brand-700" />
                    <span>ইউজারভিত্তিক রিসেন্ট স্ক্যান ডিলিট অনুমোদন তালিকা</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    প্রতিটি ইউজারের নামের পাশে অনুমোদন দিন অথবা এক ক্লিকে সবাইকে পারমিশন দিন।
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleAllPermissions(true)}
                    disabled={updatingAllPerm}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>সকলকে পারমিশন দিন</span>
                  </button>

                  <button
                    onClick={() => handleToggleAllPermissions(false)}
                    disabled={updatingAllPerm}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 transition-colors shadow-2xs"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>সকলের পারমিশন বাতিল</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-50/60 rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-200/70">
                {users.map((u) => {
                  const isUpdatingPerm = updatingPermUserId === u.id;
                  const uScansCount = recentScans.filter(
                    (s) =>
                      (s.userId && s.userId.toLowerCase() === u.id.toLowerCase()) ||
                      (s.username && s.username.toLowerCase() === u.username.toLowerCase())
                  ).length;

                  return (
                    <div
                      key={u.id}
                      className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-slate-900">
                            {u.name || u.username}
                          </span>
                          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded border border-slate-200">
                            ID: {u.username}
                          </span>
                          {u.isAdmin ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500">
                              মোট স্ক্যান: {uScansCount} টি
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        {u.isAdmin ? (
                          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                            Admin (Full Access)
                          </span>
                        ) : (
                          <button
                            onClick={() => handleToggleUserPermission(u)}
                            disabled={isUpdatingPerm}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                              u.canDeleteRecent
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : "bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-300"
                            }`}
                          >
                            {isUpdatingPerm ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : u.canDeleteRecent ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>অনুমোদিত (Approved)</span>
                              </>
                            ) : (
                              <>
                                <Unlock className="w-3.5 h-3.5" />
                                <span>অনুমোদন দিন (Approve)</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Password for Selected User */}
      {selectedUserForPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-base mb-1">
              <KeyRound className="w-5 h-5" />
              <span>Change Password</span>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Set new password for <span className="font-bold text-slate-800">{selectedUserForPass.name || selectedUserForPass.username}</span>
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

      {/* Modal: Edit User (Name, User ID, Password, Profile Picture) by Admin */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-base">
                <Edit className="w-5 h-5" />
                <span>Edit User Details</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserForEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUserEdit} className="space-y-4">
              {/* Profile Picture Section */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full p-1 bg-white shadow-md border border-slate-200">
                    {editProfilePic ? (
                      <img
                        src={editProfilePic}
                        alt="Profile Preview"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-extrabold text-2xl uppercase">
                        {(editName || editUsername || "U").charAt(0)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Hidden File Input */}
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleEditFileSelect}
                />

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 shadow-2xs transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{editProfilePic ? "ছবি পরিবর্তন করুন" : "ছবি যুক্ত করুন"}</span>
                  </button>

                  {editProfilePic && (
                    <button
                      type="button"
                      onClick={() => setEditProfilePic("")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                      title="Remove profile picture"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>মুছুন</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Name Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User Name (ইউজার এর নাম) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. মোঃ ইমরান হোসেন"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
                />
              </div>

              {/* User ID / Username Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  User ID (লগইন আইডি / মোবাইল নম্বর) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  লগইন করার জন্য ইউজার এই আইডি ব্যবহার করবে
                </span>
              </div>

              {/* Password Input (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Password (নতুন পাসওয়ার্ড)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="পরিবর্তন না করতে চাইলে খালি রাখুন"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  খালি রাখলে বর্তমান পাসওয়ার্ড বহাল থাকবে
                </span>
              </div>

              {/* Reset 1-time change limit checkbox for non-admin users */}
              {!selectedUserForEdit.isAdmin && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      ইউজারের ছবি পরিবর্তনের লিমিট রিসেট
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {selectedUserForEdit.profilePicChangedByUser
                        ? "ইউজার ইতিমধ্যে ১ বার পরিবর্তন করেছে। টিক দিলে ইউজার পুনরায় ১ বার পরিবর্তন করতে পারবে।"
                        : "ইউজার এখনো লিমিট ব্যবহার করেনি।"}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={resetPicLimit}
                    onChange={(e) => setResetPicLimit(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingUser}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 disabled:opacity-50 flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {updatingUser ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes (সংরক্ষণ করুন)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
