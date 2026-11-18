"use client";

import React, { useEffect, useRef, useState } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { usePathname, useRouter } from "next/navigation";
import { fetchUserConversations } from "@/lib/services/chatService";
import {
  playIncomingMessageSound,
  showBrowserNotification,
  requestNotificationPermission,
} from "@/lib/utils/chatSound";
import { MessageSquare, Bell, X } from "lucide-react";
import toast from "react-hot-toast";

export function ChatNotificationManager() {
  const { currentUser } = useUserAuth();
  const pathname = usePathname();
  const router = useRouter();

  const lastCheckedTimeRef = useRef<number>(Date.now());
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const [showPermissionBanner, setShowPermissionBanner] = useState(false);

  // Check if browser notifications are supported and prompt
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register Service Worker for Mobile/Tablet Background Notifications
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Chat Service Worker registered successfully:", reg.scope);
        })
        .catch((err) => {
          console.warn("Service Worker registration failed:", err);
        });
    }

    if (!("Notification" in window)) return;
    if (Notification.permission === "default" && currentUser) {
      // Don't disturb right away, wait 2 seconds
      const t = setTimeout(() => {
        setShowPermissionBanner(true);
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  const handleEnableNotification = async () => {
    const perm = await requestNotificationPermission();
    setShowPermissionBanner(false);
    if (perm === "granted") {
      toast.success("চ্যাট নোটিফিকেশন সফলভাবে চালু করা হয়েছে!");
      playIncomingMessageSound();
    } else {
      toast("নোটিফিকেশন অনুমতি দেওয়া হয়নি। আপনি ব্রাউজার সেটিংসে গিয়ে অন করতে পারেন।");
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    const checkIncomingMessages = async () => {
      try {
        const convs = await fetchUserConversations(currentUser.id, currentUser.username);

        for (const conv of convs) {
          const last = conv.lastMessage;
          if (!last) continue;

          // Message was sent TO current user and has not been notified yet
          const isToMe = last.senderId !== currentUser.id;
          const isNewerThanMount = last.createdAt > lastCheckedTimeRef.current - 1500;
          const msgKey = `${conv.id}_${last.createdAt}_${last.text}`;

          if (isToMe && isNewerThanMount && !seenMessageIdsRef.current.has(msgKey)) {
            seenMessageIdsRef.current.add(msgKey);

            // Other participant info
            const senderDetail = conv.participantDetails[last.senderId];
            const senderName = senderDetail?.name || senderDetail?.username || "নতুন মেসেজ";
            const senderPhone = senderDetail?.username || "";

            // 1. Play Sound Alert (WhatsApp chime)
            playIncomingMessageSound();

            // 2. Browser Native Notification (Android System Notification / Desktop Notification)
            showBrowserNotification(
              `মেসেজ পাঠিয়েছেন: ${senderName}`,
              last.text,
              senderDetail?.profilePic || undefined,
              () => {
                router.push(`/chat?convId=${conv.id}`);
              },
              {
                url: `/chat?convId=${conv.id}`,
                convId: conv.id,
              }
            );

            // 3. In-App Floating Toast Notification (if not on that exact chat page or just browsing)
            const isCurrentlyOnThisChat =
              pathname === "/chat" &&
              typeof window !== "undefined" &&
              window.location.search.includes(conv.id);

            if (!isCurrentlyOnThisChat) {
              toast.custom(
                (t) => (
                  <div
                    onClick={() => {
                      toast.dismiss(t.id);
                      router.push(`/chat?convId=${conv.id}`);
                    }}
                    className={`${
                      t.visible ? "animate-in slide-in-from-top-3" : "animate-out fade-out"
                    } max-w-sm w-full bg-slate-900 text-white shadow-2xl rounded-2xl pointer-events-auto flex items-center p-3 gap-3 border border-slate-700 cursor-pointer hover:bg-slate-800 transition-all`}
                  >
                    {senderDetail?.profilePic ? (
                      <img
                        src={senderDetail.profilePic}
                        alt={senderName}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
                        {(senderName.charAt(0) || "U").toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-white truncate">{senderName}</p>
                        <span className="text-[10px] text-emerald-400 font-medium">নতুন মেসেজ</span>
                      </div>
                      <p className="text-xs text-slate-300 truncate mt-0.5">{last.text}</p>
                      {senderPhone && (
                        <p className="text-[10px] text-slate-400 font-mono">{senderPhone}</p>
                      )}
                    </div>
                  </div>
                ),
                { duration: 4500, position: "top-right" }
              );
            }
          }
        }
      } catch (err) {
        // non-fatal
      }
    };

    const interval = setInterval(checkIncomingMessages, 3500);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [currentUser?.id, currentUser?.username, pathname, router]);

  if (!showPermissionBanner) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-white rounded-2xl p-3.5 shadow-2xl border border-slate-200/90 flex items-start gap-3 animate-in slide-in-from-bottom duration-200">
      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
        <Bell className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-bold text-slate-900">চ্যাট নোটিফিকেশন চালু করবেন?</h5>
        <p className="text-[11px] text-slate-500 mt-0.5">
          অন্য কেউ মেসেজ পাঠালে হোয়াটসঅ্যাপের মতো সাথে সাথে শব্দ ও নোটিফিকেশন পাবেন।
        </p>
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleEnableNotification}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            হ্যাঁ, চালু করুন
          </button>
          <button
            onClick={() => setShowPermissionBanner(false)}
            className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs transition-colors"
          >
            পরে
          </button>
        </div>
      </div>
      <button
        onClick={() => setShowPermissionBanner(false)}
        className="text-slate-400 hover:text-slate-600 p-1"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
