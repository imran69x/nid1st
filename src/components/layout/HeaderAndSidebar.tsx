"use client";

import React, { useState, useRef } from "react";
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
  History,
  Users,
  UserPlus,
  Sliders,
  Camera,
  Upload,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { updateUserProfilePic, resizeImageToAvatar } from "@/lib/services/userService";
import toast from "react-hot-toast";

export function HeaderAndSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, logout, systemConfig, updateUserLocalState } = useUserAuth();

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [previewPic, setPreviewPic] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = currentUser?.name || currentUser?.username || "User";
  const showRecentButton = isAdmin || !systemConfig.hideRecentScans;
  const initial = (displayName.charAt(0) || "U").toUpperCase();

  // User can only change their profile picture ONCE unless they are Admin
  const hasUsedChange = !isAdmin && Boolean(currentUser?.profilePicChangedByUser);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("অনুগ্রহ করে একটি ছবি ফাইল সিলেক্ট করুন");
      return;
    }

    try {
      const resizedBase64 = await resizeImageToAvatar(file);
      setPreviewPic(resizedBase64);
    } catch {
      toast.error("ছবি প্রসেস করা সম্ভব হয়নি");
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  const handleSaveProfilePic = async () => {
    if (!previewPic || !currentUser?.id) return;

    setUploadingPic(true);
    try {
      const updatedUser = await updateUserProfilePic(currentUser.id, previewPic);
      updateUserLocalState({
        profilePic: updatedUser.profilePic,
        profilePicChangedByUser: updatedUser.profilePicChangedByUser,
      });
      toast.success("প্রোফাইল ছবি সফলভাবে আপডেট হয়েছে!");
      setIsProfileModalOpen(false);
      setPreviewPic(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile picture");
    } finally {
      setUploadingPic(false);
    }
  };

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

          {/* User Status & Navigation Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                {/* Recent Scans shortcut link */}
                {showRecentButton && (
                  <Link
                    href="/recent"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      pathname === "/recent"
                        ? "bg-brand-50 text-brand-900 border border-brand-200"
                        : "text-slate-700 hover:bg-slate-100 border border-slate-200/80"
                    }`}
                    title="Recent Scans"
                  >
                    <History className="w-3.5 h-3.5 text-brand-700" />
                    <span>Recent</span>
                  </Link>
                )}

                {/* Round Profile Picture & Display Name */}
                <div
                  onClick={() => setIsProfileModalOpen(true)}
                  className="flex items-center gap-2 cursor-pointer p-1 -mr-1 rounded-xl hover:bg-slate-100/80 transition-colors"
                  title="Click to view/change profile"
                >
                  {currentUser.profilePic ? (
                    <img
                      src={currentUser.profilePic}
                      alt={displayName}
                      className="w-8 h-8 rounded-full object-cover border border-slate-300 shadow-2xs"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      {initial}
                    </div>
                  )}

                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1">
                      {displayName}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {currentUser.name && currentUser.name !== currentUser.username && (
                        <span className="mr-1 font-mono text-[9px] bg-slate-100 px-1 py-0.2 rounded">
                          {currentUser.username}
                        </span>
                      )}
                      {isAdmin ? "Administrator" : "Active Member"}
                    </div>
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

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
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

              {/* Recent Scans Link */}
              {showRecentButton && (
                <Link
                  href="/recent"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    pathname === "/recent"
                      ? "bg-brand-50 text-brand-900 font-semibold shadow-xs"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <History className="w-4 h-4 text-brand-600" />
                  <span>Recent Scans (রিসেন্ট স্ক্যান)</span>
                </Link>
              )}

              {/* Admin Panel button - ONLY visible if currentUser.isAdmin is true */}
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
                  {/* User Profile Card in Slider */}
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3 mb-2.5">
                      {/* Round Profile Picture in Slider */}
                      <div className="relative">
                        {currentUser.profilePic ? (
                          <img
                            src={currentUser.profilePic}
                            alt={displayName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-brand-500 shadow-xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-extrabold text-lg shadow-xs">
                            {initial}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate">
                          {displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          ID: {currentUser.username}
                        </div>
                        <div className="mt-0.5">
                          {isAdmin ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.2 rounded">
                              Admin
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded">
                              Active Member
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Profile Button to Change Profile Pic */}
                    <button
                      onClick={() => {
                        setIsOpen(false);
                        setPreviewPic(null);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-900 border border-slate-200/80 transition-colors"
                    >
                      <Camera className="w-3.5 h-3.5 text-brand-700" />
                      <span>Profile (ছবি পরিবর্তন)</span>
                      {!isAdmin && currentUser.profilePicChangedByUser && (
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1 py-0.2 rounded ml-1 font-mono">
                          1/1
                        </span>
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-brand-800 hover:bg-brand-900 rounded-xl transition-colors"
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

      {/* User Profile Picture Change Modal */}
      {isProfileModalOpen && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 relative animate-in zoom-in-95 duration-150">
            {/* Close Button */}
            <button
              onClick={() => {
                setIsProfileModalOpen(false);
                setPreviewPic(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <h3 className="text-base font-bold text-slate-900">User Profile Picture</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {displayName} (ID: {currentUser.username})
              </p>
            </div>

            {/* Round Picture Preview */}
            <div className="flex justify-center mb-5">
              <div className="w-28 h-28 rounded-full p-1.5 bg-gradient-to-tr from-brand-700 to-indigo-600 shadow-lg">
                {previewPic ? (
                  <img
                    src={previewPic}
                    alt="Preview"
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                ) : currentUser.profilePic ? (
                  <img
                    src={currentUser.profilePic}
                    alt="Current Profile"
                    className="w-full h-full rounded-full object-cover bg-white"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-brand-800 font-extrabold text-3xl">
                    {initial}
                  </div>
                )}
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Condition: Regular user already used 1-time change */}
            {hasUsedChange ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 leading-relaxed">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">ছবি পরিবর্তন সীমা শেষ (Limit Reached)</span>
                    আপনি ইতিমধ্যে ১ বার প্রোফাইল ছবি পরিবর্তন করেছেন। নিয়ম অনুযায়ী ইউজার কেবল ১ বার পরিবর্তন করতে পারেন। আরও পরিবর্তন করতে চাইলে অ্যাডমিনের সাথে যোগাযোগ করুন।
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  বন্ধ করুন (Close)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center text-xs text-slate-500 font-medium">
                  {!isAdmin && (
                    <span className="text-amber-700 font-semibold block mb-1">
                      ⚠️ নোট: আপনি কেবল ১ বার প্রোফাইল ছবি পরিবর্তন করতে পারবেন।
                    </span>
                  )}
                  ডিভাইস থেকে পরিষ্কার ও সুন্দর ছবি আপলোড করুন।
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPic}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-brand-700" />
                    <span>{previewPic ? "অন্য ছবি নির্বাচন করুন" : "নতুন ছবি নির্বাচন করুন"}</span>
                  </button>

                  {previewPic && (
                    <button
                      type="button"
                      onClick={handleSaveProfilePic}
                      disabled={uploadingPic}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-md transition-all flex items-center justify-center gap-2"
                    >
                      {uploadingPic ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>সংরক্ষণ করুন (Save Picture)</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

