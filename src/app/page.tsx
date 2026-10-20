"use client";

import React, { useState, useRef } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { ExtractedMember } from "@/types/user";
import {
  Scan,
  Plus,
  RotateCcw,
  Copy,
  Check,
  Upload,
  Camera,
  FileText,
  AlertTriangle,
  Loader2,
  Trash2,
  History,
} from "lucide-react";
import toast from "react-hot-toast";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { compressImageForUpload } from "@/lib/ocr/imagePreprocess";

interface ImageItem {
  id: string;
  dataUrl: string;
  name: string;
}

export default function ScannerHomePage() {
  const { currentUser, isLoading, systemConfig, isBlocked, setShowLockedModal, isAdmin } = useUserAuth();
  const router = useRouter();

  // Selected images to scan
  const [selectedImages, setSelectedImages] = useState<ImageItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [scanningProgress, setScanningProgress] = useState<{ current: number; total: number } | null>(null);
  const [members, setMembers] = useState<ExtractedMember[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [currentScanId, setCurrentScanId] = useState<string | null>(null);

  // Guard against locked/blocked user
  const checkBlocked = () => {
    if (isBlocked || currentUser?.isBlocked) {
      setShowLockedModal(true);
      toast.error("Your account is locked. Please contact developer.");
      return true;
    }
    return false;
  };

  // Redirect to login if user not logged in
  useEffect(() => {
    if (!isLoading && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, isLoading, router]);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Handle image files selection with automatic compression (reduces 5-10MB camera files to ~180KB)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (checkBlocked()) {
      e.target.value = "";
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    e.target.value = ""; // Reset input so same files can be re-selected if necessary

    setIsProcessingFiles(true);
    const toastId = toast.loading(`Optimizing ${fileList.length} document(s)...`);

    try {
      const compressedList: ImageItem[] = [];

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        if (fileList.length > 1) {
          toast.loading(`Optimizing document ${i + 1} of ${fileList.length}...`, { id: toastId });
        }
        // Resizes down large camera/tablet images to max 1600px (~150-250KB JPEG)
        const compressedDataUrl = await compressImageForUpload(file);
        compressedList.push({
          id: "img_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6) + "_" + i,
          dataUrl: compressedDataUrl,
          name: file.name,
        });
      }

      if (hasScanned) {
        // If user is already on results screen and clicks "Add Another", automatically scan newly added card(s) and append progressively
        setIsScanning(true);
        const totalNew = compressedList.length;
        let hasIncrementedNew = false;
        const newAddedMembers: ExtractedMember[] = [];

        for (let i = 0; i < totalNew; i++) {
          if (i > 0) {
            await new Promise((r) => setTimeout(r, 800));
          }
          setScanningProgress((prev) => {
            const curr = (prev?.current || members.length) + 1;
            const tot = (prev?.total || members.length) + totalNew;
            return { current: curr, total: tot };
          });
          toast.loading(`Scanning document ${members.length + i + 1}...`, { id: toastId });

          const shouldIncrement = !hasIncrementedNew;

          try {
            const res = await fetch("/api/ocr", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                image: compressedList[i].dataUrl,
                userId: currentUser?.id,
                username: currentUser?.username,
                shouldIncrement: shouldIncrement,
              }),
            });

            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              throw new Error(errData.error || `Scan failed with status ${res.status}`);
            }

            hasIncrementedNew = true;

            const data = await res.json();
            if (data.members && Array.isArray(data.members)) {
              data.members.forEach((m: any) => {
                const added: ExtractedMember = {
                  ...m,
                  memberIndex: members.length + newAddedMembers.length + 1,
                };
                newAddedMembers.push(added);
                setMembers((prev) => [...prev, added]);
              });
            }
          } catch (docErr: any) {
            const errMember: ExtractedMember = {
              memberIndex: members.length + newAddedMembers.length + 1,
              docType: "nid",
              nameBangla: "",
              nameEnglish: "",
              fatherNameBangla: "",
              fatherNameEnglish: "",
              motherNameBangla: "",
              motherNameEnglish: "",
              nidNumber: "",
              dateOfBirth: "",
              error: docErr?.message || "Failed to scan document",
            };
            newAddedMembers.push(errMember);
            setMembers((prev) => [...prev, errMember]);
          }
        }

        setSelectedImages((prev) => [...prev, ...compressedList]);
        toast.success(`Successfully added ${totalNew} member(s)!`, { id: toastId });

        // Update the recent scan record with all members
        const allMembers = [...members, ...newAddedMembers];
        if (allMembers.length > 0) {
          const firstCard = allMembers[0];
          const cardTitle = firstCard.nameBangla || firstCard.nameEnglish || "NID Document";
          try {
            await fetch("/api/recent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: currentScanId || ("scan_" + Date.now()),
                title: cardTitle,
                members: allMembers,
                userId: currentUser?.id,
                username: currentUser?.username,
                userDisplayName: currentUser?.name || currentUser?.username,
              }),
            });
          } catch (saveErr) {
            console.warn("Failed to update recent scan:", saveErr);
          }
        }
      } else {
        setSelectedImages((prev) => [...prev, ...compressedList]);
        toast.success(`${compressedList.length} document(s) ready to scan!`, { id: toastId });
      }
    } catch (err: any) {
      console.error("Image processing error:", err);
      toast.error(err.message || "Failed to process image(s)", { id: toastId });
    } finally {
      setIsProcessingFiles(false);
      setIsScanning(false);
      setScanningProgress(null);
    }
  };

  // 1. SCAN ACTION (Progressive rendering: 1st card displays immediately upon scan, rest appear sequentially below!)
  const handleScan = async () => {
    if (checkBlocked()) return;

    if (!systemConfig.scanningEnabled) {
      toast.error("Scanning feature is currently disabled by Admin.");
      return;
    }

    if (selectedImages.length === 0) {
      toast.error("Please add at least one NID or Birth Certificate image.");
      return;
    }

    const total = selectedImages.length;
    setMembers([]);
    setHasScanned(true); // Switch to display mode immediately so 1st card pops up as soon as it's scanned!
    setIsScanning(true);
    setScanningProgress({ current: 1, total });
    const toastId = toast.loading(`Scanning document 1 of ${total}...`);

    const scanSessionId = "scan_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
    setCurrentScanId(scanSessionId);

    const extractedSoFar: ExtractedMember[] = [];
    let hasIncremented = false;

    try {
      for (let i = 0; i < total; i++) {
        setScanningProgress({ current: i + 1, total });
        toast.loading(`Scanning document ${i + 1} of ${total}...`, { id: toastId });

        // Small pause between consecutive scans to respect Google Gemini API burst limits
        if (i > 0) {
          await new Promise((r) => setTimeout(r, 800));
        }

        const shouldIncrement = !hasIncremented;

        try {
          const res = await fetch("/api/ocr", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image: selectedImages[i].dataUrl,
              userId: currentUser?.id,
              username: currentUser?.username,
              shouldIncrement: shouldIncrement,
            }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || `Server error (status ${res.status})`);
          }

          hasIncremented = true; // Counted exactly once for this entire scan button click!

          const data = await res.json();
          if (data.members && Array.isArray(data.members)) {
            data.members.forEach((m: any) => {
              const newMember: ExtractedMember = {
                ...m,
                memberIndex: extractedSoFar.length + 1,
              };
              extractedSoFar.push(newMember);
              setMembers((prev) => [...prev, newMember]);
            });
          }
        } catch (docErr: any) {
          console.error(`Error scanning document ${i + 1}:`, docErr);
          const errMember: ExtractedMember = {
            memberIndex: extractedSoFar.length + 1,
            docType: "nid",
            nameBangla: "",
            nameEnglish: "",
            fatherNameBangla: "",
            fatherNameEnglish: "",
            motherNameBangla: "",
            motherNameEnglish: "",
            nidNumber: "",
            dateOfBirth: "",
            error: docErr?.message || "Failed to scan this document",
          };
          extractedSoFar.push(errMember);
          setMembers((prev) => [...prev, errMember]);
        }
      }

      toast.success(`Successfully scanned ${total} member(s)!`, { id: toastId });

      // Automatically save to Recent Scans with the 1st card's name as title
      if (extractedSoFar.length > 0) {
        const firstMember = extractedSoFar[0];
        const cardTitle = firstMember.nameBangla || firstMember.nameEnglish || "NID Document";
        try {
          await fetch("/api/recent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: scanSessionId,
              title: cardTitle,
              members: extractedSoFar,
              userId: currentUser?.id,
              username: currentUser?.username,
              userDisplayName: currentUser?.name || currentUser?.username,
            }),
          });
        } catch (saveErr) {
          console.warn("Failed to auto-save recent scan:", saveErr);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to scan documents", { id: toastId });
    } finally {
      setIsScanning(false);
      setScanningProgress(null);
    }
  };

  // 2. ADD ANOTHER ACTION
  const handleAddAnother = () => {
    if (checkBlocked()) return;
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 3. RETAKE / RESET ACTION
  const handleRetake = () => {
    if (checkBlocked()) return;
    setSelectedImages([]);
    setMembers([]);
    setHasScanned(false);
    setScanningProgress(null);
    setCurrentScanId(null);
    toast.success("Ready for new scan");
  };

  // Copy single field
  const copyField = (val: string, keyId: string) => {
    if (checkBlocked()) return;
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

  // Copy all fields for a member
  const copyAllMemberFields = (m: ExtractedMember, idx: number) => {
    if (checkBlocked()) return;
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

  // Update member field on user edit
  const updateMemberField = (memberIdx: number, field: keyof ExtractedMember, value: string) => {
    setMembers((prev) =>
      prev.map((m, i) => (i === memberIdx ? { ...m, [field]: value } : m))
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Maintenance alert if scanning is disabled by admin */}
      {!systemConfig.scanningEnabled && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-3 text-rose-900 text-sm font-semibold">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>সার্ভার সাময়িকভাবে অ্যাডমিন কর্তৃক বন্ধ রাখা হয়েছে। বর্তমানে নতুন স্ক্যান গ্রহণ করা হচ্ছে না।</span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* BEFORE SCAN: Upload and Core 3 Buttons */}
      {!hasScanned ? (
        <div className="space-y-6">
          {/* Document Upload Area */}
          <div
            onClick={() => {
              if (checkBlocked()) return;
              fileInputRef.current?.click();
            }}
            className="border-2 border-dashed border-slate-300 hover:border-brand-600 rounded-3xl p-8 sm:p-12 text-center bg-white hover:bg-brand-50/20 transition-all cursor-pointer shadow-soft group"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-brand-50 group-hover:bg-brand-100 flex items-center justify-center text-brand-700 transition-colors mb-4">
              <Upload className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              Upload NID or Birth Certificate
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              এনআইডি বা জন্ম নিবন্ধন সনদ আপলোড করুন (JPEG, PNG, WebP)
            </p>
            <p className="text-[11px] text-brand-700 font-medium mt-2">
              Supports multiple cards at once for family members
            </p>
          </div>

          {/* Camera Capture shortcut */}
          <div className="flex justify-center">
            <button
              onClick={() => {
                if (checkBlocked()) return;
                cameraInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-xs"
            >
              <Camera className="w-4 h-4 text-brand-700" />
              Use Camera
            </button>
          </div>

          {/* Selected documents counter badges */}
          {selectedImages.length > 0 && (
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-800">
                  Ready to scan ({selectedImages.length} file{selectedImages.length > 1 ? "s" : ""})
                </span>
                <span className="text-[11px] text-slate-400">
                  Card images will hide automatically after scanning
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedImages.map((img, i) => (
                  <div
                    key={img.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700"
                  >
                    <FileText className="w-3.5 h-3.5 text-brand-600" />
                    <span>সদস্য {i + 1} Document</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImages((prev) => prev.filter((item) => item.id !== img.id));
                      }}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* THE 3 CORE BUTTONS (ONLY WHAT USER REQUESTED) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            {/* 1. SCAN */}
            <button
              onClick={handleScan}
              disabled={isScanning || isProcessingFiles || selectedImages.length === 0 || !systemConfig.scanningEnabled}
              className="py-3 px-5 rounded-2xl font-bold text-sm text-white bg-brand-800 hover:bg-brand-900 shadow-md shadow-brand-900/10 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : isProcessingFiles ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4" />
                  Scan (স্ক্যান করুন)
                </>
              )}
            </button>

            {/* 2. ADD ANOTHER */}
            <button
              onClick={handleAddAnother}
              disabled={isScanning || isProcessingFiles}
              className="py-3 px-5 rounded-2xl font-bold text-sm text-brand-900 bg-brand-50 hover:bg-brand-100 border border-brand-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Plus className="w-4 h-4 text-brand-700" />
              Add Another (আরেকটি যোগ করুন)
            </button>

            {/* 3. RETAKE */}
            <button
              onClick={handleRetake}
              disabled={isScanning || isProcessingFiles || selectedImages.length === 0}
              className="py-3 px-5 rounded-2xl font-bold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              Retake (নতুন করে নিন)
            </button>
          </div>
        </div>
      ) : (
        /* AFTER SCAN: ONLY EXTRACTED FIELDS ARE SHOWN (CARD IMAGES HIDDEN AS REQUESTED) */
        <div className="space-y-8">
          {/* Top Control Bar with 3 Core Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <span>Scanned Members: <span className="text-brand-800">{members.length}</span></span>
              {isScanning && scanningProgress && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 animate-pulse flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  প্রসেসিং: {scanningProgress.current} / {scanningProgress.total}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Recent Scans shortcut */}
              {(isAdmin || !systemConfig.hideRecentScans) && (
                <Link
                  href="/recent"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors shadow-2xs"
                >
                  <History className="w-3.5 h-3.5 text-brand-700" />
                  <span>Recent</span>
                </Link>
              )}

              {/* Add Another Member */}
              <button
                onClick={handleAddAnother}
                disabled={isScanning || isProcessingFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-brand-50 text-brand-800 border border-brand-200 hover:bg-brand-100 transition-colors disabled:opacity-40"
              >
                {isScanning || isProcessingFiles ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Add Another
              </button>

              {/* Retake / Reset */}
              <button
                onClick={handleRetake}
                disabled={isScanning || isProcessingFiles}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-40"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retake / Reset
              </button>
            </div>
          </div>

          {/* Members List Cards */}
          {members.map((m, idx) => (
            <div
              key={idx}
              className="bg-white rounded-3xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-6"
            >
              {/* Member Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-800 text-white font-bold flex items-center justify-center shadow-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      সদস্য {idx + 1} ({m.docType === "birth_certificate" ? "জন্ম নিবন্ধন" : "NID"})
                    </h2>
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

              {m.error && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>{m.error}</span>
                </div>
              )}


              {/* 8 Information Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. নাম (বাংলা) */}
                <FieldInput
                  label="নাম (বাংলা)"
                  value={m.nameBangla}
                  onChange={(v) => updateMemberField(idx, "nameBangla", v)}
                  onCopy={() => copyField(m.nameBangla, `m_${idx}_nameBangla`)}
                  isCopied={copiedKey === `m_${idx}_nameBangla`}
                  isBengali
                />

                {/* 2. Name (English) */}
                <FieldInput
                  label="Name (English)"
                  value={m.nameEnglish}
                  onChange={(v) => updateMemberField(idx, "nameEnglish", v)}
                  onCopy={() => copyField(m.nameEnglish, `m_${idx}_nameEnglish`)}
                  isCopied={copiedKey === `m_${idx}_nameEnglish`}
                />

                {/* 3. পিতার নাম (বাংলা) */}
                <FieldInput
                  label="পিতার নাম (বাংলা)"
                  value={m.fatherNameBangla}
                  onChange={(v) => updateMemberField(idx, "fatherNameBangla", v)}
                  onCopy={() => copyField(m.fatherNameBangla, `m_${idx}_fatherNameBangla`)}
                  isCopied={copiedKey === `m_${idx}_fatherNameBangla`}
                  isBengali
                />

                {/* 4. Father's Name (English) */}
                <FieldInput
                  label="Father's Name (English)"
                  value={m.fatherNameEnglish}
                  onChange={(v) => updateMemberField(idx, "fatherNameEnglish", v)}
                  onCopy={() => copyField(m.fatherNameEnglish, `m_${idx}_fatherNameEnglish`)}
                  isCopied={copiedKey === `m_${idx}_fatherNameEnglish`}
                />

                {/* 5. মাতার নাম (বাংলা) */}
                <FieldInput
                  label="মাতার নাম (বাংলা)"
                  value={m.motherNameBangla}
                  onChange={(v) => updateMemberField(idx, "motherNameBangla", v)}
                  onCopy={() => copyField(m.motherNameBangla, `m_${idx}_motherNameBangla`)}
                  isCopied={copiedKey === `m_${idx}_motherNameBangla`}
                  isBengali
                />

                {/* 6. Mother's Name (English) */}
                <FieldInput
                  label="Mother's Name (English)"
                  value={m.motherNameEnglish}
                  onChange={(v) => updateMemberField(idx, "motherNameEnglish", v)}
                  onCopy={() => copyField(m.motherNameEnglish, `m_${idx}_motherNameEnglish`)}
                  isCopied={copiedKey === `m_${idx}_motherNameEnglish`}
                />

                {/* 7. NID / Birth Reg Number */}
                <FieldInput
                  label={m.docType === "birth_certificate" ? "Birth Reg No (জন্ম নিবন্ধন নম্বর)" : "NID Number"}
                  value={m.nidNumber}
                  onChange={(v) => updateMemberField(idx, "nidNumber", v)}
                  onCopy={() => copyField(m.nidNumber, `m_${idx}_nidNumber`)}
                  isCopied={copiedKey === `m_${idx}_nidNumber`}
                />

                {/* 8. Date of Birth */}
                <FieldInput
                  label="Date of Birth (DD-MM-YYYY)"
                  value={m.dateOfBirth}
                  onChange={(v) => updateMemberField(idx, "dateOfBirth", v)}
                  onCopy={() => copyField(m.dateOfBirth, `m_${idx}_dateOfBirth`)}
                  isCopied={copiedKey === `m_${idx}_dateOfBirth`}
                  placeholder="e.g. 10-01-2001"
                />
              </div>
            </div>
          ))}

          {/* Real-time Scanning Progress Indicator for Remaining Documents */}
          {isScanning && scanningProgress && (
            <div className="bg-gradient-to-r from-brand-50/70 via-white to-brand-50/40 rounded-3xl border-2 border-dashed border-brand-300 p-6 sm:p-8 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-800 text-white font-bold flex items-center justify-center shadow-xs">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    সদস্য {scanningProgress.current} এর ডকুমেন্ট স্ক্যান করা হচ্ছে...
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    আগের সদস্যদের তথ্য উপরে দেখা যাচ্ছে। এটি শেষ হলেই নিচে স্বয়ংক্রিয়ভাবে যুক্ত হবে।
                  </p>
                </div>
              </div>
              <div className="text-xs font-bold text-brand-800 bg-brand-100/80 px-4 py-2 rounded-xl border border-brand-200">
                {scanningProgress.current} / {scanningProgress.total}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

// Editable Field with Copy Button
function FieldInput({
  label,
  value,
  onChange,
  onCopy,
  isCopied,
  isBengali = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onCopy: () => void;
  isCopied: boolean;
  isBengali?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 focus-within:border-brand-500 focus-within:bg-white transition-all">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "Not detected"}
          className={`w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none ${
            isBengali ? "font-bengali" : "font-sans"
          }`}
        />
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
