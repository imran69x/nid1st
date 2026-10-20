"use client";

import React, { useState, useEffect } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { RecentScanRecord, ExtractedMember } from "@/types/user";
import {
  getRecentScans,
  deleteRecentScanRecord,
} from "@/lib/services/userService";
import {
  History,
  Copy,
  Check,
  Trash2,
  Calendar,
  Users,
  FileText,
  ArrowLeft,
  RefreshCw,
  Lock,
  EyeOff,
} from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RecentScansPage() {
  const { currentUser, isAdmin, isLoading, systemConfig } = useUserAuth();
  const router = useRouter();

  const [records, setRecords] = useState<RecentScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<RecentScanRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Can delete if user is Admin OR global delete is ON OR this user has individual approve
  const canDelete =
    isAdmin ||
    Boolean(systemConfig.allowUserDeleteRecent) ||
    Boolean(currentUser?.canDeleteRecent);

  // Check if recent scans is hidden for normal users
  const isHiddenForUser = !isAdmin && Boolean(systemConfig.hideRecentScans);

  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push("/login");
    } else if (currentUser && !isHiddenForUser) {
      loadMyScans();
    }
  }, [currentUser, isLoading, router, isHiddenForUser]);

  const loadMyScans = async () => {
    setLoading(true);
    try {
      // Calls getRecentScans without all=true -> returns strictly scans performed by this account
      const data = await getRecentScans(currentUser?.id || currentUser?.username || "");
      setRecords(data);
      if (data.length > 0 && !selectedRecord) {
        setSelectedRecord(data[0]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load recent scans");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (record: RecentScanRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canDelete) {
      toast.error("রিসেন্ট স্ক্যান মুছে ফেলার অনুমতি নেই (অ্যাডমিনের অনুমতির প্রয়োজন)।");
      return;
    }

    if (!confirm(`Are you sure you want to delete scan record '${record.title}'?`)) {
      return;
    }

    setDeletingId(record.id);
    try {
      await deleteRecentScanRecord(record.id, currentUser?.id || currentUser?.username || "");
      toast.success("স্ক্যান রেকর্ড সফলভাবে মুছে ফেলা হয়েছে!");
      const nextRecords = records.filter((r) => r.id !== record.id);
      setRecords(nextRecords);
      if (selectedRecord?.id === record.id) {
        setSelectedRecord(nextRecords.length > 0 ? nextRecords[0] : null);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    } finally {
      setDeletingId(null);
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

  const copyAllMemberFields = (m: ExtractedMember, idx: number) => {
    const text = [
      `সদস্য ${idx + 1} (${m.docType === "birth_certificate" ? "জন্ম নিবন্ধন" : "NID"})`,
      `নাম (বাংলা): ${m.nameBangla || ""}`,
      `Name (English): ${m.nameEnglish || ""}`,
      `পিতার নাম (বাংলা): ${m.fatherNameBangla || ""}`,
      `Father's Name (English): ${m.fatherNameEnglish || ""}`,
      `মাতার নাম (বাংলা): ${m.motherNameBangla || ""}`,
      `Mother's Name (English): ${m.motherNameEnglish || ""}`,
      `নম্বর (NID/Birth Reg): ${m.nidNumber || ""}`,
      `Date of Birth: ${m.dateOfBirth || ""}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    toast.success(`সদস্য ${idx + 1} এর সকল তথ্য কপি করা হয়েছে!`);
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

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" /> লোড হচ্ছে...
        </div>
      </div>
    );
  }

  // If Admin has hidden recent scans for normal users
  if (isHiddenForUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <EyeOff className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">
            রিসেন্ট স্ক্যান বন্ধ রয়েছে
          </h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            রিসেন্ট স্ক্যান অপশনটি বর্তমানে অ্যাডমিন কর্তৃক সাময়িকভাবে বন্ধ রাখা হয়েছে।
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-sm transition-all"
          >
            হোম পেজে ফিরে যান
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to Scanner"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <History className="w-6 h-6 text-brand-700" />
                Recent Scans (রিসেন্ট স্ক্যান)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-50 text-brand-800 border border-brand-200">
                {records.length} টি স্ক্যান
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isAdmin
                ? `অ্যাডমিন একাউন্ট (${currentUser.name || currentUser.username}) দিয়ে করা স্ক্যান সমূহের তালিকা`
                : "আপনার একাউন্ট দিয়ে পূর্বে স্ক্যান করা সকল কার্ডের সংরক্ষিত তালিকা ও বিস্তারিত তথ্য"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin?tab=recent-scans"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              <span>সকল ইউজারের স্ক্যান (Admin Panel)</span>
            </Link>
          )}

          <button
            onClick={loadMyScans}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            রিফ্রেশ
          </button>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5" />
            নতুন স্ক্যান
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-400 text-sm">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-brand-600" />
          রিসেন্ট স্ক্যান লোড হচ্ছে...
        </div>
      ) : records.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">কোন রিসেন্ট স্ক্যান পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
            আপনি যখনই কোনো এনআইডি বা জন্ম নিবন্ধন স্ক্যান করবেন, তা স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবে।
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-sm"
          >
            এনআইডি স্ক্যান শুরু করুন
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Personal Scans List (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden max-h-[750px] overflow-y-auto">
            <div className="p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">স্ক্যান হিস্টোরি ({records.length})</span>
              <span className="text-[11px] text-slate-500">১ম কার্ডের নাম</span>
            </div>

            {records.map((rec) => {
              const isSelected = selectedRecord?.id === rec.id;
              return (
                <div
                  key={rec.id}
                  onClick={() => setSelectedRecord(rec)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-brand-50/70 border-l-4 border-brand-800"
                      : "hover:bg-slate-50/80 border-l-4 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 text-sm truncate" title={rec.title}>
                        {rec.title}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {formatDate(rec.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-brand-800">
                          <Users className="w-3 h-3 text-brand-600" />
                          {rec.totalMembers} সদস্য
                        </span>
                      </div>
                    </div>

                    {/* Delete button (only if permitted) */}
                    {canDelete && (
                      <button
                        onClick={(e) => handleDelete(rec, e)}
                        disabled={deletingId === rec.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="মুছে ফেলুন"
                      >
                        {deletingId === rec.id ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-rose-600" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Record Details Display (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {selectedRecord ? (
              <>
                {/* Header for Selected Record */}
                <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-700 block">
                      স্ক্যান রেকর্ড বিস্তারিত
                    </span>
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-0.5">
                      {selectedRecord.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
                      <span>{formatDate(selectedRecord.createdAt)}</span>
                      <span>•</span>
                      <span>মোট {selectedRecord.members.length} টি কার্ড</span>
                      {selectedRecord.userDisplayName && (
                        <>
                          <span>•</span>
                          <span>স্ক্যান করেছেন: {selectedRecord.userDisplayName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {canDelete ? (
                    <button
                      onClick={(e) => handleDelete(selectedRecord, e)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      মুছে ফেলুন
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-xl">
                      <Lock className="w-3 h-3" /> ডিলিট অনুমতি নেই
                    </span>
                  )}
                </div>

                {/* Member Cards rendered EXACTLY like the scan result */}
                <div className="space-y-6">
                  {selectedRecord.members.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 sm:p-8 space-y-6"
                    >
                      {/* Member Header */}
                      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-800 text-white font-bold flex items-center justify-center shadow-xs">
                            {idx + 1}
                          </div>
                          <div>
                            <h3 className="text-base sm:text-lg font-bold text-slate-900">
                              সদস্য {idx + 1} ({m.docType === "birth_certificate" ? "জন্ম নিবন্ধন" : "NID"})
                            </h3>
                            <p className="text-xs text-slate-500 font-medium">
                              {m.nameEnglish || m.nameBangla || "Extracted Record"}
                            </p>
                          </div>
                        </div>

                        {/* Copy All Button */}
                        <button
                          onClick={() => copyAllMemberFields(m, idx)}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-brand-800 hover:bg-brand-900 shadow-xs transition-all"
                        >
                          <Copy className="w-3.5 h-3.5" /> Copy All (সব কপি করুন)
                        </button>
                      </div>

                      {/* 8 Information Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. নাম (বাংলা) */}
                        <RecentFieldDisplay
                          label="নাম (বাংলা)"
                          value={m.nameBangla}
                          onCopy={() => copyField(m.nameBangla, `r_${idx}_nameBangla`)}
                          isCopied={copiedKey === `r_${idx}_nameBangla`}
                          isBengali
                        />

                        {/* 2. Name (English) */}
                        <RecentFieldDisplay
                          label="Name (English)"
                          value={m.nameEnglish}
                          onCopy={() => copyField(m.nameEnglish, `r_${idx}_nameEnglish`)}
                          isCopied={copiedKey === `r_${idx}_nameEnglish`}
                        />

                        {/* 3. পিতার নাম (বাংলা) */}
                        <RecentFieldDisplay
                          label="পিতার নাম (বাংলা)"
                          value={m.fatherNameBangla}
                          onCopy={() => copyField(m.fatherNameBangla, `r_${idx}_fatherNameBangla`)}
                          isCopied={copiedKey === `r_${idx}_fatherNameBangla`}
                          isBengali
                        />

                        {/* 4. Father's Name (English) */}
                        <RecentFieldDisplay
                          label="Father's Name (English)"
                          value={m.fatherNameEnglish}
                          onCopy={() => copyField(m.fatherNameEnglish, `r_${idx}_fatherNameEnglish`)}
                          isCopied={copiedKey === `r_${idx}_fatherNameEnglish`}
                        />

                        {/* 5. মাতার নাম (বাংলা) */}
                        <RecentFieldDisplay
                          label="মাতার নাম (বাংলা)"
                          value={m.motherNameBangla}
                          onCopy={() => copyField(m.motherNameBangla, `r_${idx}_motherNameBangla`)}
                          isCopied={copiedKey === `r_${idx}_motherNameBangla`}
                          isBengali
                        />

                        {/* 6. Mother's Name (English) */}
                        <RecentFieldDisplay
                          label="Mother's Name (English)"
                          value={m.motherNameEnglish}
                          onCopy={() => copyField(m.motherNameEnglish, `r_${idx}_motherNameEnglish`)}
                          isCopied={copiedKey === `r_${idx}_motherNameEnglish`}
                        />

                        {/* 7. NID / Birth Reg Number */}
                        <RecentFieldDisplay
                          label={
                            m.docType === "birth_certificate"
                              ? "Birth Reg No (জন্ম নিবন্ধন নম্বর)"
                              : "NID Number"
                          }
                          value={m.nidNumber}
                          onCopy={() => copyField(m.nidNumber, `r_${idx}_nidNumber`)}
                          isCopied={copiedKey === `r_${idx}_nidNumber`}
                        />

                        {/* 8. Date of Birth */}
                        <RecentFieldDisplay
                          label="Date of Birth (DD-MM-YYYY)"
                          value={m.dateOfBirth}
                          onCopy={() => copyField(m.dateOfBirth, `r_${idx}_dateOfBirth`)}
                          isCopied={copiedKey === `r_${idx}_dateOfBirth`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center text-slate-400 border border-slate-200">
                বামপাশের তালিকা থেকে যে কোন একটি স্ক্যান নির্বাচন করুন
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Display component matching FieldInput exactly
function RecentFieldDisplay({
  label,
  value,
  onCopy,
  isCopied,
  isBengali = false,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  isCopied: boolean;
  isBengali?: boolean;
}) {
  return (
    <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 focus-within:border-brand-500 focus-within:bg-white transition-all">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-center justify-between gap-2">
        <div
          className={`w-full text-sm font-semibold text-slate-900 select-all truncate ${
            isBengali ? "font-bengali" : "font-sans"
          }`}
        >
          {value || <span className="text-slate-400 font-normal">Not detected</span>}
        </div>
        <button
          onClick={onCopy}
          className={`shrink-0 p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
            isCopied
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 hover:text-brand-800 border border-slate-200 shadow-2xs"
          }`}
          title="Copy"
        >
          {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
