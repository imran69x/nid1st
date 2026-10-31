"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Camera,
  X,
  RotateCw,
  Zap,
  ZapOff,
  CheckCircle2,
  AlertCircle,
  FileText,
  Scan,
  Sparkles,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

interface AutoCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (dataUrl: string, fileName: string) => void;
}

type DocMode = "nid" | "birth_certificate";

export function AutoCaptureModal({
  isOpen,
  onClose,
  onCapture,
}: AutoCaptureModalProps) {
  const [docMode, setDocMode] = useState<DocMode>("nid");
  const [isReady, setIsReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0 to 100
  const [clarityStatus, setClarityStatus] = useState<"blurry" | "good" | "capturing">("blurry");
  const [flashEffect, setFlashEffect] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stabilityCounterRef = useRef(0);
  const isCapturingRef = useRef(false);

  // Stop camera stream cleanly
  const stopStream = useCallback(() => {
    if (analysisIntervalRef.current) {
      clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setIsReady(false);
    setStabilityProgress(0);
    stabilityCounterRef.current = 0;
    isCapturingRef.current = false;
  }, []);

  // Native camera file input ref for direct snap fallback
  const nativeInputRef = useRef<HTMLInputElement>(null);

  // Handle native file input fallback
  const handleNativeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        stopStream();
        onCapture(dataUrl, `native_${docMode}_${file.name}`);
        onClose();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Start camera stream with multi-stage fallback
  const startCamera = useCallback(async () => {
    stopStream();
    setCameraError(null);
    setIsReady(false);

    // Wait 150ms to allow Windows driver to release previous hardware handle
    await new Promise((r) => setTimeout(r, 150));

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (typeof window !== "undefined" && !window.isSecureContext) {
        setCameraError(
          "ব্রাউজার সিকিউরিটি পলিসির কারণে লোকাল HTTP আইপি অ্যাড্রেসে লাইভ ভিডিও ক্যামেরা লক থাকে (HTTPS ছাড়া ব্রাউজার ক্যামেরা এলাউ করে না)। তবে নিচের সবুজ 'ডিফল্ট ক্যামেরা দিয়ে ছবি তুলুন' বাটনে চাপ দিয়ে সরাসরি ট্যাবের ক্যামেরা দিয়ে ছবি তুলে স্ক্যান করতে পারবেন!"
        );
      } else {
        setCameraError("আপনার ব্রাউজারে ক্যামেরা সাপোর্ট পাওয়া যায়নি। অনুগ্রহ করে Chrome বা Edge ব্যবহার করুন।");
      }
      return;
    }

    const candidateConstraints: MediaStreamConstraints[] = [
      // 1. Flexible 720p/1080p with ideal facing mode
      {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      // 2. Ideal resolution without facingMode (for desktop/laptop webcams)
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      },
      // 3. Fallback to basic video: true (universal compatibility)
      {
        video: true,
        audio: false,
      },
    ];

    let stream: MediaStream | null = null;
    let lastErr: any = null;

    for (const constraints of candidateConstraints) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err: any) {
        lastErr = err;
        console.warn("Retrying camera with fallback constraints:", err?.name, err?.message);
      }
    }

    if (!stream) {
      console.error("All camera constraints failed:", lastErr);
      let msg = "ক্যামেরা ওপেন করা সম্ভব হয়নি।";
      if (lastErr?.name === "NotReadableError") {
        msg = "ক্যামেরাটি বর্তমানে অন্য কোনো অ্যাপে (যেমন Windows Camera, Zoom, OBS বা ব্রাউজারের অন্য ট্যাবে) ব্যবহৃত হচ্ছে। অনুগ্রহ করে সেটি বন্ধ করে আবার চেষ্টা করুন।";
      } else if (lastErr?.name === "NotAllowedError" || lastErr?.name === "PermissionDeniedError") {
        msg = "ক্যামেরা পারমিশন ডিনাই করা হয়েছে। অনুগ্রহ করে ব্রাউজার সেটিংসে গিয়ে ক্যামেরা এলাউ করুন।";
      } else if (lastErr?.name === "NotFoundError" || lastErr?.name === "DevicesNotFoundError") {
        msg = "ডিভাইসে কোনো ক্যামেরা পাওয়া যায়নি।";
      } else if (lastErr?.message) {
        msg = lastErr.message;
      }
      setCameraError(msg);
      return;
    }

    streamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        videoRef.current?.play().then(() => {
          setIsReady(true);
        }).catch((err) => {
          console.warn("Video play error:", err);
        });
      };
    }

    // Check if torch is supported
    const track = stream.getVideoTracks()[0];
    if (track) {
      const capabilities = (track.getCapabilities && track.getCapabilities()) as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    }
  }, [facingMode, stopStream]);

  // Toggle Torch/Flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nextState = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setTorchOn(nextState);
      } catch (err) {
        console.warn("Torch error:", err);
      }
    }
  };

  // Flip Camera (Front / Back)
  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Trigger high-res capture from video element
  const triggerCapture = useCallback(() => {
    if (isCapturingRef.current) return;
    isCapturingRef.current = true;
    setClarityStatus("capturing");

    const video = videoRef.current;
    if (!video) return;

    // Visual shutter flash
    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const fullCanvas = document.createElement("canvas");
      const vWidth = video.videoWidth || 1280;
      const vHeight = video.videoHeight || 720;
      fullCanvas.width = vWidth;
      fullCanvas.height = vHeight;

      const ctx = fullCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      // Draw full camera frame
      ctx.drawImage(video, 0, 0, vWidth, vHeight);

      // Convert to JPEG dataURL (~90% quality)
      const dataUrl = fullCanvas.toDataURL("image/jpeg", 0.92);
      const fileName = `auto_${docMode}_${Date.now()}.jpg`;

      // Beep audio feedback using Web Audio API
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctxAudio = new AudioCtx();
          const osc = ctxAudio.createOscillator();
          const gain = ctxAudio.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(880, ctxAudio.currentTime); // High pitch pleasant snap
          gain.gain.setValueAtTime(0.15, ctxAudio.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctxAudio.currentTime + 0.15);
          osc.connect(gain);
          gain.connect(ctxAudio.destination);
          osc.start();
          osc.stop(ctxAudio.currentTime + 0.15);
        }
      } catch {}

      toast.success("ডকুমেন্ট সফলভাবে ক্যাপচার হয়েছে!");
      stopStream();
      onCapture(dataUrl, fileName);
      onClose();
    } catch (err: any) {
      console.error("Capture snapshot error:", err);
      toast.error("ছবি তুলতে সমস্যা হয়েছে, আবার চেষ্টা করুন");
      isCapturingRef.current = false;
      setClarityStatus("blurry");
    }
  }, [docMode, onCapture, onClose, stopStream]);

  // Real-time clarity analysis algorithm (Laplacian / Edge Gradient Variance)
  useEffect(() => {
    if (!isOpen || !isReady || isCapturingRef.current) return;

    const sampleCanvas = sampleCanvasRef.current;
    const video = videoRef.current;
    if (!sampleCanvas || !video) return;

    const sampleCtx = sampleCanvas.getContext("2d", { willReadFrequently: true });
    if (!sampleCtx) return;

    // Sample down to 320x200 for lightning-fast 60fps edge analysis without lag
    const sWidth = 320;
    const sHeight = Math.round((sWidth * (video.videoHeight || 720)) / (video.videoWidth || 1280)) || 200;
    sampleCanvas.width = sWidth;
    sampleCanvas.height = sHeight;

    analysisIntervalRef.current = setInterval(() => {
      if (!video || video.readyState < 2 || isCapturingRef.current) return;

      try {
        sampleCtx.drawImage(video, 0, 0, sWidth, sHeight);

        // We examine the central 60% of the viewfinder (where the NID text / number is positioned)
        const cropX = Math.round(sWidth * 0.2);
        const cropY = Math.round(sHeight * 0.25);
        const cropW = Math.round(sWidth * 0.6);
        const cropH = Math.round(sHeight * 0.5);

        const imgData = sampleCtx.getImageData(cropX, cropY, cropW, cropH);
        const pixels = imgData.data;
        const totalPixels = cropW * cropH;

        let totalBrightness = 0;
        let sumGradient = 0;
        let sumGradientSq = 0;
        let count = 0;

        // Grayscale conversion and horizontal/vertical high-frequency edge variance
        for (let y = 1; y < cropH - 1; y += 2) {
          for (let x = 1; x < cropW - 1; x += 2) {
            const idx = (y * cropW + x) * 4;
            // Luminance
            const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
            totalBrightness += lum;

            // Simple 4-way discrete Laplacian / edge gradient:
            // 4 * center - top - bottom - left - right
            const topIdx = ((y - 1) * cropW + x) * 4;
            const bottomIdx = ((y + 1) * cropW + x) * 4;
            const leftIdx = (y * cropW + (x - 1)) * 4;
            const rightIdx = (y * cropW + (x + 1)) * 4;

            const topLum = 0.299 * pixels[topIdx] + 0.587 * pixels[topIdx + 1] + 0.114 * pixels[topIdx + 2];
            const bottomLum = 0.299 * pixels[bottomIdx] + 0.587 * pixels[bottomIdx + 1] + 0.114 * pixels[bottomIdx + 2];
            const leftLum = 0.299 * pixels[leftIdx] + 0.587 * pixels[leftIdx + 1] + 0.114 * pixels[leftIdx + 2];
            const rightLum = 0.299 * pixels[rightIdx] + 0.587 * pixels[rightIdx + 1] + 0.114 * pixels[rightIdx + 2];

            const laplacian = Math.abs(4 * lum - topLum - bottomLum - leftLum - rightLum);

            sumGradient += laplacian;
            sumGradientSq += laplacian * laplacian;
            count++;
          }
        }

        const avgBrightness = totalBrightness / count;
        const meanGradient = sumGradient / count;
        const variance = sumGradientSq / count - meanGradient * meanGradient;

        // Threshold check:
        // Text dense ID cards in focus have variance > 30 and brightness between 50 and 240
        const isGoodLighting = avgBrightness > 45 && avgBrightness < 245;
        const isSharp = variance >= 32;

        if (isGoodLighting && isSharp) {
          setClarityStatus("good");
          stabilityCounterRef.current = Math.min(stabilityCounterRef.current + 25, 100);
          setStabilityProgress(stabilityCounterRef.current);

          // Once it stays clear & stable for 4 ticks (~800ms), AUTO SNAP!
          if (stabilityCounterRef.current >= 100 && !isCapturingRef.current) {
            triggerCapture();
          }
        } else {
          setClarityStatus("blurry");
          // Gradually decay stability if slightly moved, or drop if very blurry
          stabilityCounterRef.current = Math.max(stabilityCounterRef.current - 20, 0);
          setStabilityProgress(stabilityCounterRef.current);
        }
      } catch (err) {
        console.warn("Clarity compute error:", err);
      }
    }, 200);

    return () => {
      if (analysisIntervalRef.current) {
        clearInterval(analysisIntervalRef.current);
        analysisIntervalRef.current = null;
      }
    };
  }, [isOpen, isReady, triggerCapture]);

  // Lifecycle control
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [isOpen, startCamera, stopStream]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between overflow-hidden select-none animate-in fade-in duration-200">
      {/* Hidden canvas for image clarity processing */}
      <canvas ref={sampleCanvasRef} className="hidden" />

      {/* Hidden native camera capture input */}
      <input
        ref={nativeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeFile}
        className="hidden"
      />

      {/* Shutter Flash Animation */}
      {flashEffect && (
        <div className="absolute inset-0 bg-white z-50 pointer-events-none transition-opacity duration-150 animate-out fade-out" />
      )}

      {/* TOP HEADER CONTROLS */}
      <div className="relative z-30 flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Document Mode Toggle: NID Card vs Birth Certificate */}
        <div className="flex items-center gap-1.5 p-1 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15">
          <button
            onClick={() => {
              setDocMode("nid");
              setStabilityProgress(0);
              stabilityCounterRef.current = 0;
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              docMode === "nid"
                ? "bg-emerald-500 text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>NID Card (এনআইডি)</span>
          </button>

          <button
            onClick={() => {
              setDocMode("birth_certificate");
              setStabilityProgress(0);
              stabilityCounterRef.current = 0;
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              docMode === "birth_certificate"
                ? "bg-emerald-500 text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Birth Cert (জন্ম নিবন্ধন)</span>
          </button>
        </div>

        {/* Right utility buttons: Torch, Flip, Close */}
        <div className="flex items-center gap-2">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`p-2.5 rounded-2xl border transition-all ${
                torchOn
                  ? "bg-amber-400 text-slate-900 border-amber-300"
                  : "bg-white/10 text-white border-white/15 hover:bg-white/20"
              }`}
              title={torchOn ? "ফ্ল্যাশ লাইট বন্ধ করুন" : "ফ্ল্যাশ লাইট চালু করুন"}
            >
              {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={flipCamera}
            className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition-all"
            title="ক্যামেরা পরিবর্তন করুন"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              stopStream();
              onClose();
            }}
            className="p-2.5 rounded-2xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition-all"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MIDDLE: CAMERA VIEWFINDER & LIVE FRAME */}
      <div className="relative flex-1 flex items-center justify-center p-4">
        {/* Camera Error Message */}
        {cameraError ? (
          <div className="max-w-md p-6 bg-slate-900 border border-rose-500/50 rounded-3xl text-center text-white space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-rose-300">ক্যামেরা চালু করা যায়নি</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{cameraError}</p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
              <button
                onClick={startCamera}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                আবার চেষ্টা করুন
              </button>

              <button
                onClick={() => nativeInputRef.current?.click()}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 shadow-md"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ডিফল্ট ক্যামেরা দিয়ে ছবি তুলুন</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full max-w-2xl max-h-[75vh] flex items-center justify-center overflow-hidden rounded-3xl">
            {/* Live Camera Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {!isReady && (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-white gap-3 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                <span className="text-xs font-medium text-slate-300">ক্যামেরা প্রস্তুত হচ্ছে...</span>
              </div>
            )}

            {/* Dark Mask Vignette Around Target Frame */}
            <div className="absolute inset-0 pointer-events-none bg-black/45" />

            {/* CUTOUT VIEWFINDER BOX (SHAPED ACCORDING TO NID OR BIRTH CERTIFICATE) */}
            <div
              className={`relative z-10 transition-all duration-300 pointer-events-none ${
                docMode === "nid"
                  ? "w-[85vw] max-w-[420px] aspect-[1.58/1]"
                  : "w-[85vw] max-w-[380px] aspect-[1/1.3]"
              }`}
            >
              {/* Hollow cutout styling to highlight the card inside */}
              <div
                className={`w-full h-full rounded-2xl transition-all duration-200 border-2 ${
                  clarityStatus === "good"
                    ? "border-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.45)]"
                    : "border-white/60 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
                }`}
                style={{
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.45)",
                }}
              >
                {/* 4 Corner L-brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser scan line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan-beam" />

                {/* Card placement watermark/guide */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/50 pointer-events-none">
                  {docMode === "nid" ? (
                    <>
                      <div className="w-10 h-10 rounded-xl border border-white/25 flex items-center justify-center mb-2">
                        <Scan className="w-5 h-5 text-white/60" />
                      </div>
                      <span className="text-xs font-bold text-white/80">এনআইডি কার্ড সোজা করে রাখুন</span>
                      <span className="text-[10px] text-white/50 mt-0.5 font-bengali">
                        নাম ও নম্বর ফোকাসে এলে অটো ছবি উঠবে
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-xl border border-white/25 flex items-center justify-center mb-2">
                        <FileText className="w-5 h-5 text-white/60" />
                      </div>
                      <span className="text-xs font-bold text-white/80">জন্ম নিবন্ধন সনদ রাখুন</span>
                      <span className="text-[10px] text-white/50 mt-0.5 font-bengali">
                        ১৭ ডিজিট নম্বর ও নামের অংশ স্পষ্ট করুন
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* STABILITY / PROGRESS CIRCLE INDICATOR */}
              {stabilityProgress > 0 && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 text-white border border-emerald-500/50 text-xs font-bold shadow-lg animate-in fade-in">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                  <span>ক্যাপচার হচ্ছে... {stabilityProgress}%</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM FOOTER CONTROLS & MANUAL SNAP */}
      <div className="relative z-30 px-6 py-5 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center gap-3">
        {/* Status Message Badge */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {clarityStatus === "good" ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold animate-pulse">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>পরিষ্কার ফোকাস পাওয়া গেছে! স্থির রাখুন...</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-slate-300 border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>কার্ডটি ফ্রেমে সোজা ও স্থির রাখুন (অটো স্ন্যাপ সক্রিয়)</span>
            </span>
          )}
        </div>

        {/* Big Manual Snap Button */}
        <div className="flex items-center justify-center gap-6 mt-1">
          <button
            onClick={triggerCapture}
            disabled={!isReady}
            className="group relative w-16 h-16 rounded-full p-1 bg-white hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-40"
            title="সরাসরি ছবি তুলুন (Manual Snap)"
          >
            <div className="w-full h-full rounded-full border-2 border-slate-900 bg-white group-hover:bg-slate-100 flex items-center justify-center transition-colors">
              <Camera className="w-6 h-6 text-slate-900" />
            </div>
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium">
          বাটনে চাপ ছাড়াও লেখা স্পষ্ট হলে স্বয়ংক্রিয়ভাবে ছবি উঠে যাবে
        </p>
      </div>
    </div>
  );
}
