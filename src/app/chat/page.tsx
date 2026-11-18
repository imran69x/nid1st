"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useUserAuth } from "@/lib/services/userAuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Phone,
  User,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Volume2,
  VolumeX,
  Bell,
  Smile,
  Sticker,
} from "lucide-react";
import toast from "react-hot-toast";
import { ChatConversation, ChatMessage, ChatParticipant } from "@/types/chat";
import {
  fetchUserConversations,
  fetchConversationMessages,
  sendChatMessage,
  markChatAsSeen,
  searchUserByNumber,
  startConversationWithNumber,
} from "@/lib/services/chatService";
import {
  playIncomingMessageSound,
  playOutgoingMessageSound,
  isSoundEnabled,
  setSoundEnabled,
  requestNotificationPermission,
} from "@/lib/utils/chatSound";
import { STICKER_PACKS, QUICK_EMOJIS, StickerItem } from "@/lib/utils/stickers";

function ChatInner() {
  const { currentUser, isLoading } = useUserAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Conversations & selected chat
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(true);

  // Messages in active conversation
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);

  // Sound settings
  const [soundOn, setSoundOn] = useState(true);

  // Search in conversation list
  const [searchQuery, setSearchQuery] = useState("");

  // Add User by Number Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [inputNumber, setInputNumber] = useState("");
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState<{
    id: string;
    username: string;
    name: string;
    profilePic?: string;
    isSelf: boolean;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [creatingChat, setCreatingChat] = useState(false);

  // Responsive view toggle: 'list' (conversation list) or 'chat' (active chat room)
  // On screens < 1024px (Mobile & Tablets), only one view is shown at a time
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  // Emoji & Sticker picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [emojiTab, setEmojiTab] = useState<"emoji" | "sticker">("emoji");
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevMessagesCountRef = useRef<number>(0);

  // Initialize sound preference
  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  // Click outside to close emoji picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(e.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  // Insert emoji into text input
  const handleInsertEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Send sticker as a message
  const handleSendSticker = async (sticker: StickerItem) => {
    if (!selectedConvId || !currentUser?.id || sending) return;
    setShowEmojiPicker(false);
    setSending(true);
    playOutgoingMessageSound();

    // Optimistic sticker message
    const tempMsg: ChatMessage = {
      id: "temp_" + Date.now(),
      conversationId: selectedConvId,
      senderId: currentUser.id,
      senderName: currentUser.name || currentUser.username,
      recipientId: activeConv?.participants.find((p) => p !== currentUser.id) || "",
      text: sticker.id,
      messageType: "sticker",
      createdAt: Date.now(),
      seen: false,
      seenAt: null,
    };
    setMessages((prev) => [...prev, tempMsg]);
    prevMessagesCountRef.current += 1;

    try {
      const savedMsg = await sendChatMessage(selectedConvId, currentUser.id, sticker.id, "sticker");
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? savedMsg : m)));
      loadConversations(true);
    } catch (err: any) {
      toast.error(err.message || "স্টিকার পাঠানো সম্ভব হয়নি");
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  // Authentication check
  useEffect(() => {
    if (!isLoading && !currentUser) {
      toast.error("চ্যাট ব্যবহার করতে অনুগ্রহ করে লগইন করুন");
      router.push("/login");
    }
  }, [currentUser, isLoading, router]);

  // Load conversations
  const loadConversations = useCallback(
    async (silent = false) => {
      if (!currentUser?.id) return;
      if (!silent) setLoadingConversations(true);
      try {
        const list = await fetchUserConversations(currentUser.id, currentUser.username);
        setConversations(list);

        // If URL has target convId, select it
        const targetId = searchParams.get("convId");
        if (targetId && !selectedConvId) {
          const match = list.find((c) => c.id === targetId);
          if (match) {
            setSelectedConvId(match.id);
            setMobileView("chat");
          }
        }
      } catch (err: any) {
        if (!silent) toast.error(err.message || "কথোপকথন লোড করা সম্ভব হয়নি");
      } finally {
        if (!silent) setLoadingConversations(false);
      }
    },
    [currentUser?.id, currentUser?.username, searchParams, selectedConvId]
  );

  // Initial load
  useEffect(() => {
    if (currentUser?.id) {
      loadConversations();
    }
  }, [currentUser?.id, loadConversations]);

  // Background polling for conversations every 5 seconds
  useEffect(() => {
    if (!currentUser?.id) return;
    const interval = setInterval(() => {
      loadConversations(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [currentUser?.id, loadConversations]);

  // Load messages for selected conversation
  const loadMessages = useCallback(
    async (convId: string, silent = false) => {
      if (!currentUser?.id) return;
      if (!silent) setLoadingMessages(true);
      try {
        const msgs = await fetchConversationMessages(convId, currentUser.id, currentUser.username);

        // Check if new incoming message arrived to play sound
        if (
          silent &&
          msgs.length > prevMessagesCountRef.current &&
          prevMessagesCountRef.current > 0
        ) {
          const latestMsg = msgs[msgs.length - 1];
          if (latestMsg && latestMsg.senderId !== currentUser.id) {
            playIncomingMessageSound();
          }
        }
        prevMessagesCountRef.current = msgs.length;

        setMessages(msgs);

        // Mark as seen immediately if there are unread messages sent to me
        const hasUnread = msgs.some((m) => m.recipientId === currentUser.id && !m.seen);
        if (hasUnread) {
          await markChatAsSeen(convId, currentUser.id);
          // Refresh conversation unread badges silently
          loadConversations(true);
        }
      } catch (err: any) {
        if (!silent) toast.error(err.message || "মেসেজ লোড করা সম্ভব হয়নি");
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [currentUser?.id, currentUser?.username, loadConversations]
  );

  // When selected conversation changes
  useEffect(() => {
    if (selectedConvId) {
      prevMessagesCountRef.current = 0;
      loadMessages(selectedConvId);
      setMobileView("chat");
    } else {
      setMessages([]);
    }
  }, [selectedConvId, loadMessages]);

  // Fast polling for messages (every 2.5 seconds) while a conversation is active
  useEffect(() => {
    if (!selectedConvId || !currentUser?.id) return;
    const interval = setInterval(() => {
      loadMessages(selectedConvId, true);
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedConvId, currentUser?.id, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Selected conversation object
  const activeConv = conversations.find((c) => c.id === selectedConvId) || null;

  // Recipient details for active conversation
  const getOtherParticipant = (conv: ChatConversation): ChatParticipant => {
    if (!currentUser) return { id: "", username: "", name: "User" };
    const otherId = conv.participants.find((p) => p !== currentUser.id);
    if (otherId && conv.participantDetails[otherId]) {
      return conv.participantDetails[otherId];
    }
    const otherUsername = conv.participantUsernames.find(
      (u) => u.toLowerCase() !== (currentUser.username || "").toLowerCase()
    );
    return {
      id: otherId || "unknown",
      username: otherUsername || "User",
      name: otherUsername || "User",
    };
  };

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || !selectedConvId || !currentUser?.id || sending) return;

    setSending(true);
    setInputText("");

    // Play subtle outgoing pop sound
    playOutgoingMessageSound();

    // Optimistic local message with single tick
    const tempMsg: ChatMessage = {
      id: "temp_" + Date.now(),
      conversationId: selectedConvId,
      senderId: currentUser.id,
      senderName: currentUser.name || currentUser.username,
      recipientId: activeConv?.participants.find((p) => p !== currentUser.id) || "",
      text,
      messageType: "text",
      createdAt: Date.now(),
      seen: false,
      seenAt: null,
    };

    setMessages((prev) => [...prev, tempMsg]);
    prevMessagesCountRef.current += 1;

    try {
      const savedMsg = await sendChatMessage(selectedConvId, currentUser.id, text);
      // Replace temp message with server saved message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMsg.id ? savedMsg : m))
      );
      // Refresh conversations list to update lastMessage
      loadConversations(true);
    } catch (err: any) {
      toast.error(err.message || "মেসেজ পাঠানো সম্ভব হয়নি");
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
      setInputText(text); // restore input
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Search user by number in modal
  const handleSearchUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = inputNumber.trim();
    if (!num) {
      toast.error("অনুগ্রহ করে ফোন নম্বর লিখুন");
      return;
    }

    setSearchingUser(true);
    setSearchError(null);
    setFoundUser(null);

    try {
      const res = await searchUserByNumber(num, currentUser?.id || "");
      if (!res) {
        setSearchError("এই নম্বরে কোনো ইউজার অ্যাকাউন্ট পাওয়া যায়নি।");
      } else if (res.isSelf) {
        setSearchError("এটি আপনার নিজের নম্বর। আপনি নিজের সাথে চ্যাট করতে পারবেন না।");
      } else {
        setFoundUser(res);
      }
    } catch (err: any) {
      setSearchError(err.message || "ইউজার সার্চ করতে সমস্যা হয়েছে");
    } finally {
      setSearchingUser(false);
    }
  };

  // Start chat with found user
  const handleStartChatWithFoundUser = async () => {
    if (!foundUser || !currentUser?.id || creatingChat) return;
    setCreatingChat(true);

    try {
      const conv = await startConversationWithNumber(currentUser.id, foundUser.username);
      toast.success(`${foundUser.name || foundUser.username}-এর সাথে চ্যাট শুরু হয়েছে!`);
      setIsAddModalOpen(false);
      setInputNumber("");
      setFoundUser(null);
      setSearchError(null);

      // Refresh list & select conversation
      await loadConversations(false);
      setSelectedConvId(conv.id);
      setMobileView("chat");
    } catch (err: any) {
      toast.error(err.message || "চ্যাট শুরু করা সম্ভব হয়নি");
    } finally {
      setCreatingChat(false);
    }
  };

  // Filter conversations by search input
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const other = getOtherParticipant(c);
    return (
      (other.name && other.name.toLowerCase().includes(q)) ||
      (other.username && other.username.toLowerCase().includes(q)) ||
      (c.lastMessage?.text && c.lastMessage.text.toLowerCase().includes(q))
    );
  });

  // Time formatter
  const formatTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Date formatter for message groups
  const formatDateHeader = (timestamp: number) => {
    if (!timestamp) return "";
    const msgDate = new Date(timestamp);
    const today = new Date();
    if (msgDate.toDateString() === today.toDateString()) {
      return "আজ (Today)";
    }
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (msgDate.toDateString() === yesterday.toDateString()) {
      return "গতকাল (Yesterday)";
    }
    return msgDate.toLocaleDateString("bn-BD", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    /* FIXED VIEWPORT CONTAINER: Anchored to viewport from top-16 down to bottom-0.
       Prevents mobile and tablet virtual keyboard from scrolling page header out of view! */
    <div className="fixed inset-x-0 bottom-0 top-16 z-20 flex flex-col bg-slate-100/90 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col p-1 sm:p-2 lg:p-4 min-h-0">
        
        {/* Main Chat Frame */}
        <div className="flex-1 min-h-0 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex">
          
          {/* ============================================================ */}
          {/* LEFT COLUMN: Conversation List */}
          {/* Shown full-width on Mobile & Tablet when mobileView === 'list' */}
          {/* Always shown on Desktop (lg: >= 1024px) */}
          {/* ============================================================ */}
          <div
            className={`w-full lg:w-80 xl:w-96 border-r border-slate-200 flex flex-col bg-slate-50/60 min-h-0 ${
              mobileView === "chat" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Top Header of Conversation List */}
            <div className="p-3 border-b border-slate-200 bg-white shrink-0 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push("/")}
                  className="p-1.5 -ml-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Back to Home"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-brand-700" />
                  <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                    মেসেঞ্জার চ্যাট
                  </span>
                </div>
              </div>

              {/* Add User by Number Button */}
              <button
                onClick={() => {
                  setIsAddModalOpen(true);
                  setInputNumber("");
                  setFoundUser(null);
                  setSearchError(null);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold shadow-2xs transition-all active:scale-95 shrink-0"
                title="Add user by phone number"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন চ্যাট</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-2.5 border-b border-slate-200/80 bg-white shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="নাম বা নম্বর দিয়ে চ্যাট খুঁজুন..."
                  className="w-full pl-9 pr-7 py-2 text-xs rounded-xl bg-slate-100/80 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800 placeholder-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Conversations Scroll Area */}
            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100">
              {loadingConversations ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin text-brand-600" />
                  কথোপকথন লোড হচ্ছে...
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">কোনো চ্যাট পাওয়া যায়নি</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    উপরের &ldquo;নতুন চ্যাট&rdquo; বাটনে ক্লিক করে ইউজারের নম্বর দিয়ে চ্যাট শুরু করুন।
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-brand-800 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> নম্বর দিয়ে যোগ করুন
                  </button>
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const other = getOtherParticipant(conv);
                  const isSelected = conv.id === selectedConvId;
                  const isMyLastMsg = conv.lastMessage?.senderId === currentUser?.id;
                  const hasUnread = (conv.unreadCount || 0) > 0;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setSelectedConvId(conv.id);
                        setMobileView("chat");
                      }}
                      className={`p-3 sm:px-4 cursor-pointer transition-all flex items-center gap-3 relative ${
                        isSelected
                          ? "bg-brand-50/90 border-l-4 border-brand-800"
                          : hasUnread
                          ? "bg-emerald-50/50 hover:bg-slate-100/90"
                          : "hover:bg-slate-100/70"
                      }`}
                    >
                      {/* Round Avatar */}
                      <div className="relative shrink-0">
                        {other.profilePic ? (
                          <img
                            src={other.profilePic}
                            alt={other.name}
                            className="w-11 h-11 rounded-full object-cover ring-2 ring-slate-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-bold text-sm shadow-2xs">
                            {(other.name?.charAt(0) || other.username.charAt(0) || "U").toUpperCase()}
                          </div>
                        )}
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                      </div>

                      {/* Middle Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <h4
                            className={`text-xs sm:text-sm font-bold truncate ${
                              hasUnread ? "text-slate-900 font-extrabold" : "text-slate-800"
                            }`}
                          >
                            {other.name || other.username}
                          </h4>
                          {conv.lastMessage?.createdAt && (
                            <span className="text-[10px] text-slate-400 font-mono shrink-0 ml-1">
                              {formatTime(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          {/* Last Message Preview with WhatsApp tick */}
                          <div className="truncate flex items-center gap-1 mr-2">
                            {conv.lastMessage ? (
                              <>
                                {isMyLastMsg && (
                                  <span className="shrink-0" title={conv.lastMessage.seen ? "Seen" : "Sent"}>
                                    {conv.lastMessage.seen ? (
                                      <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                                    )}
                                  </span>
                                )}
                                <span
                                  className={`truncate ${
                                    hasUnread ? "font-bold text-slate-900" : "text-slate-600"
                                  }`}
                                >
                                  {conv.lastMessage.text}
                                </span>
                              </>
                            ) : (
                              <span className="text-slate-400 italic">কোনো বার্তা নেই</span>
                            )}
                          </div>

                          {/* Unread badge */}
                          {hasUnread && (
                            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shadow-2xs">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                          নম্বর: {other.username}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* RIGHT COLUMN: Active Chat Panel */}
          {/* Shown full-width on Mobile & Tablet when mobileView === 'chat' */}
          {/* Always shown on Desktop (lg: >= 1024px) */}
          {/* ============================================================ */}
          <div
            className={`flex-1 min-h-0 flex flex-col bg-slate-100/50 ${
              mobileView === "list" ? "hidden lg:flex" : "flex"
            }`}
          >
            {activeConv ? (
              <>
                {/* 1. STICKY TOP CHAT HEADER: ALWAYS VISIBLE, NEVER SCROLLS OFF SCREEN */}
                {(() => {
                  const other = getOtherParticipant(activeConv);
                  return (
                    <div className="shrink-0 p-2.5 sm:p-3.5 px-3 sm:px-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-2xs z-10">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        {/* Back button on Mobile and Tablet (lg:hidden) */}
                        <button
                          onClick={() => setMobileView("list")}
                          className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
                          title="Back to chat list"
                        >
                          <ArrowLeft className="w-5 h-5" />
                        </button>

                        <div className="relative shrink-0">
                          {other.profilePic ? (
                            <img
                              src={other.profilePic}
                              alt={other.name}
                              className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/50 shadow-2xs"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-bold text-sm ring-2 ring-emerald-500/50 shadow-2xs">
                              {(other.name?.charAt(0) || other.username.charAt(0) || "U").toUpperCase()}
                            </div>
                          )}
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight truncate">
                            {other.name || other.username}
                          </h3>
                          <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5 mt-0.5 truncate">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{other.username}</span>
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-emerald-700 font-medium text-[10px] hidden sm:inline">
                              সরাসরি যুক্ত
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Sound Toggle Button */}
                        <button
                          onClick={() => {
                            const next = !soundOn;
                            setSoundOn(next);
                            setSoundEnabled(next);
                            toast.success(
                              next ? "চ্যাট সাউন্ড চালু করা হয়েছে" : "চ্যাট সাউন্ড বন্ধ করা হয়েছে"
                            );
                          }}
                          className="p-2 text-slate-400 hover:text-brand-800 hover:bg-slate-100 rounded-xl transition-colors"
                          title={soundOn ? "সাউন্ড বন্ধ করুন" : "সাউন্ড চালু করুন"}
                        >
                          {soundOn ? (
                            <Volume2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-400" />
                          )}
                        </button>

                        {/* Refresh Button */}
                        <button
                          onClick={() => loadMessages(activeConv.id)}
                          className="p-2 text-slate-400 hover:text-brand-800 hover:bg-slate-100 rounded-xl transition-colors"
                          title="Refresh Messages"
                        >
                          <RefreshCw className={`w-4 h-4 ${loadingMessages ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* 2. SCROLLABLE MESSAGES CONTAINER: ONLY THIS AREA SCROLLS */}
                <div className="flex-1 min-h-0 p-3 sm:p-5 overflow-y-auto space-y-3 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                      <RefreshCw className="w-5 h-5 animate-spin text-brand-600 mr-2" />
                      মেসেজ লোড হচ্ছে...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex items-center justify-center text-brand-700 mb-3">
                        <MessageSquare className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-800">এখনো কোনো মেসেজ নেই</h4>
                      <p className="text-xs text-slate-500 max-w-xs mt-1">
                        নিচের ইনপুট বক্সে একটি বার্তা লিখে পাঠিয়ে দিন এবং সরাসরি কথা বলা শুরু করুন!
                      </p>
                    </div>
                  ) : (
                    (() => {
                      let lastDateStr = "";
                      return messages.map((msg, index) => {
                        const isMe = msg.senderId === currentUser?.id;
                        const msgDateStr = new Date(msg.createdAt).toDateString();
                        const showDateHeader = msgDateStr !== lastDateStr;
                        lastDateStr = msgDateStr;

                        return (
                          <React.Fragment key={msg.id || index}>
                            {/* Centered Date Separator */}
                            {showDateHeader && (
                              <div className="flex items-center justify-center my-3">
                                <span className="px-3 py-1 rounded-full bg-white/90 border border-slate-200/80 text-[10px] font-bold text-slate-600 shadow-2xs">
                                  {formatDateHeader(msg.createdAt)}
                                </span>
                              </div>
                            )}

                            {/* Message Bubble */}
                            <div
                              className={`flex flex-col ${
                                isMe ? "items-end" : "items-start"
                              }`}
                            >
                              {/* Sticker Message: Visual Card */}
                              {msg.messageType === "sticker" ? (() => {
                                const sticker = STICKER_PACKS.find((s) => s.id === msg.text);
                                if (sticker) {
                                  return (
                                    <div className="max-w-[160px] sm:max-w-[180px]">
                                      <div
                                        className={`bg-gradient-to-br ${sticker.bgColor || "from-brand-700 to-indigo-700"} rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center shadow-md hover:scale-105 transition-transform cursor-default`}
                                      >
                                        <span className="text-5xl sm:text-6xl mb-1.5 drop-shadow-sm">
                                          {sticker.emoji}
                                        </span>
                                        {sticker.badgeText && (
                                          <span className={`text-[10px] sm:text-xs font-bold ${sticker.textColor || "text-white"} text-center leading-tight mt-0.5`}>
                                            {sticker.badgeText}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-slate-400">
                                        <span>{formatTime(msg.createdAt)}</span>
                                        {isMe && (
                                          <span className="flex items-center" title={msg.seen ? "Seen" : "Sent"}>
                                            {msg.seen ? (
                                              <CheckCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                                            ) : (
                                              <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            )}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xs ${
                                    isMe ? "bg-gradient-to-r from-brand-900 to-brand-800 text-white rounded-br-xs" : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                                  }`}>
                                    <p className="text-xs sm:text-sm">🎨 [স্টিকার]</p>
                                    <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${isMe ? "text-brand-200" : "text-slate-400"}`}>
                                      <span>{formatTime(msg.createdAt)}</span>
                                      {isMe && (msg.seen ? <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" /> : <Check className="w-3.5 h-3.5 text-white/60 shrink-0" />)}
                                    </div>
                                  </div>
                                );
                              })() : (
                              /* Regular Text Message */
                              <div
                                className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xs relative transition-all ${
                                  isMe
                                    ? "bg-gradient-to-r from-brand-900 to-brand-800 text-white rounded-br-xs"
                                    : "bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs"
                                }`}
                              >
                                {/* Message Text */}
                                <p className="text-xs sm:text-sm whitespace-pre-wrap break-words leading-relaxed">
                                  {msg.text}
                                </p>

                                {/* Footer: Timestamp & WhatsApp Ticks */}
                                <div
                                  className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                                    isMe ? "text-brand-200" : "text-slate-400"
                                  }`}
                                >
                                  <span>{formatTime(msg.createdAt)}</span>

                                  {/* WhatsApp Single / Double Blue Tick for Sent Messages */}
                                  {isMe && (
                                    <span
                                      className="flex items-center"
                                      title={
                                        msg.seen
                                          ? `Seen at ${formatTime(msg.seenAt || msg.createdAt)}`
                                          : "দেখা হয়নি"
                                      }
                                    >
                                      {msg.seen ? (
                                        /* WhatsApp Double Blue Tick */
                                        <CheckCheck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      ) : (
                                        /* WhatsApp Single Light Tick */
                                        <Check className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                              )}
                            </div>
                          </React.Fragment>
                        );
                      });
                    })()
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 3. STICKY BOTTOM MESSAGE INPUT BAR WITH EMOJI/STICKER PICKER */}
                <div className="shrink-0 bg-white border-t border-slate-200 z-10 relative" ref={emojiPickerRef}>

                  {/* Emoji/Sticker Popup Panel */}
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-20 animate-in slide-in-from-bottom-2 duration-150">
                      {/* Tabs: Emoji / Sticker */}
                      <div className="flex border-b border-slate-200">
                        <button
                          onClick={() => setEmojiTab("emoji")}
                          className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            emojiTab === "emoji"
                              ? "text-brand-800 border-b-2 border-brand-800 bg-brand-50/50"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Smile className="w-3.5 h-3.5" />
                          ইমোজি
                        </button>
                        <button
                          onClick={() => setEmojiTab("sticker")}
                          className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                            emojiTab === "sticker"
                              ? "text-brand-800 border-b-2 border-brand-800 bg-brand-50/50"
                              : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <Sticker className="w-3.5 h-3.5" />
                          স্টিকার
                        </button>
                      </div>

                      {/* Content Area */}
                      <div className="max-h-[200px] sm:max-h-[240px] overflow-y-auto p-2.5">
                        {emojiTab === "emoji" ? (
                          /* Emoji Grid */  
                          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                            {QUICK_EMOJIS.map((emoji, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleInsertEmoji(emoji)}
                                className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center text-xl sm:text-2xl rounded-lg hover:bg-slate-100 active:scale-90 transition-all"
                                title={emoji}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        ) : (
                          /* Sticker Grid */
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {STICKER_PACKS.map((sticker) => (
                              <button
                                key={sticker.id}
                                type="button"
                                onClick={() => handleSendSticker(sticker)}
                                disabled={sending}
                                className={`bg-gradient-to-br ${sticker.bgColor || "from-brand-700 to-indigo-700"} rounded-xl p-3 flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-sm disabled:opacity-50`}
                              >
                                <span className="text-2xl sm:text-3xl mb-0.5">{sticker.emoji}</span>
                                {sticker.badgeText && (
                                  <span className={`text-[8px] sm:text-[9px] font-bold ${sticker.textColor || "text-white"} text-center leading-tight`}>
                                    {sticker.badgeText}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Input Row */}
                  <div className="p-2.5 sm:p-3.5">
                    <form
                      onSubmit={handleSendMessage}
                      className="flex items-center gap-1.5 sm:gap-2"
                    >
                      {/* Emoji Toggle Button */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-2 rounded-xl transition-colors shrink-0 ${
                          showEmojiPicker
                            ? "text-brand-800 bg-brand-50 ring-2 ring-brand-200"
                            : "text-slate-400 hover:text-brand-700 hover:bg-slate-100"
                        }`}
                        title="ইমোজি / স্টিকার"
                      >
                        <Smile className="w-5 h-5" />
                      </button>

                      <input
                        ref={inputRef}
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        onFocus={() => setShowEmojiPicker(false)}
                        placeholder="একটি বার্তা লিখুন..."
                        className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm rounded-xl bg-slate-100 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 placeholder-slate-400"
                      />

                      <button
                        type="submit"
                        disabled={!inputText.trim() || sending}
                        className="p-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-brand-800 to-brand-700 hover:from-brand-900 hover:to-brand-800 text-white font-bold text-xs sm:text-sm shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">পাঠান</span>
                      </button>
                    </form>
                  </div>
                </div>
              </>
            ) : (
              /* Empty Chat State on Desktop */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-brand-700 mb-4">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">কোনো চ্যাট নির্বাচন করা নেই</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1 mb-5">
                  বাম পাশের তালিকা থেকে একটি কথোপকথন বেছে নিন অথবা নতুন কোনো ইউজারের ফোন নম্বর দিয়ে মেসেজিং শুরু করুন।
                </p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-800 hover:bg-brand-900 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন ইউজার নম্বর দিয়ে চ্যাট করুন</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL: Add User by Phone Number */}
      {/* ============================================================ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-brand-800 flex items-center justify-center text-white">
                  <Phone className="w-4 h-4 text-emerald-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">ইউজার নম্বর দিয়ে চ্যাট</h3>
                  <p className="text-[11px] text-slate-500">
                    যেকোনো ইউজারের মোবাইল নম্বর দিয়ে খুঁজুন
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setFoundUser(null);
                  setSearchError(null);
                  setInputNumber("");
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <form onSubmit={handleSearchUser} className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  ইউজারের মোবাইল নম্বর / আইডি:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={inputNumber}
                      onChange={(e) => {
                        setInputNumber(e.target.value);
                        setSearchError(null);
                        setFoundUser(null);
                      }}
                      placeholder="যেমন: 01788558181"
                      className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-900 font-mono"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searchingUser || !inputNumber.trim()}
                    className="px-4 py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shrink-0"
                  >
                    {searchingUser ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>খুঁজুন</span>
                  </button>
                </div>
              </form>

              {/* Error message */}
              {searchError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Found user card */}
              {foundUser && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-3">
                    {foundUser.profilePic ? (
                      <img
                        src={foundUser.profilePic}
                        alt={foundUser.name}
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500 shadow-2xs"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-brand-700 to-indigo-700 text-white flex items-center justify-center font-extrabold text-base shadow-2xs">
                        {(foundUser.name.charAt(0) || foundUser.username.charAt(0) || "U").toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">
                        {foundUser.name}
                      </h4>
                      <p className="text-xs text-slate-600 font-mono">
                        আইডি: {foundUser.username}
                      </p>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold text-emerald-800 bg-emerald-100/80 px-2 py-0.2 rounded-full">
                        সক্রিয় ইউজার
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleStartChatWithFoundUser}
                    disabled={creatingChat}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    {creatingChat ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <MessageSquare className="w-4 h-4" />
                    )}
                    <span>চ্যাট শুরু করুন</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 top-16 flex items-center justify-center bg-slate-50 text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-brand-600 mr-2" />
          <span>চ্যাট লোড হচ্ছে...</span>
        </div>
      }
    >
      <ChatInner />
    </Suspense>
  );
}
