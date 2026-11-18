/**
 * Firestore-backed store for users and system config.
 * Uses Firebase client SDK (NOT admin SDK) — works with project ID, app ID, etc.
 * Data persists in Firestore so it survives Vercel serverless cold starts.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Firestore,
} from "firebase/firestore";
import { DatabaseUser, SystemConfig, RecentScanRecord } from "@/types/user";
import { ChatMessage, ChatConversation, ChatParticipant } from "@/types/chat";
import fs from "fs";
import path from "path";

// ---- Firebase initialization for server-side API routes ----
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function getServerDb(): Firestore {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  return getFirestore(app);
}

// Admin credentials strictly from environment variables (.env.local / production env)
function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || "";
  const password = process.env.ADMIN_PASSWORD || "";
  return { username, password };
}

// Collection names
const USERS_COLLECTION = "users";
const CONFIG_COLLECTION = "system";
const CONFIG_DOC_ID = "config";
const RECENT_SCANS_COLLECTION = "recent_scans";
const CONVERSATIONS_COLLECTION = "conversations";

// ============================================================
// USER OPERATIONS
// ============================================================

/**
 * Ensure the default admin user exists in Firestore.
 * Called on first load / login to seed the admin if missing.
 */
export async function ensureDefaultAdmin(): Promise<void> {
  const { username, password } = getAdminCredentials();
  if (!username) {
    console.warn("[Store] ADMIN_USERNAME is not set in environment.");
    return;
  }

  const db = getServerDb();
  const adminDocRef = doc(db, USERS_COLLECTION, "admin_" + username);
  const adminSnap = await getDoc(adminDocRef);

  if (!adminSnap.exists()) {
    const adminUser: DatabaseUser = {
      id: "admin_" + username,
      username: username,
      name: "Admin",
      password: password,
      isAdmin: true,
      isBlocked: false,
      createdAt: Date.now(),
      passwordUpdatedAt: Date.now(),
      scanCount: 0,
      dailyScanCount: 0,
      lastScanDate: "",
    };
    await setDoc(adminDocRef, adminUser);
    console.log("[Store] Default admin user seeded into Firestore:", username);
  } else {
    // Ensure admin flags and password are valid
    const data = adminSnap.data();
    const updates: Partial<DatabaseUser> = {};
    if (!data.isAdmin) updates.isAdmin = true;
    if (data.isBlocked) updates.isBlocked = false;
    if (!data.name) updates.name = "Admin";
    if (!data.password && password) updates.password = password;
    if (!data.passwordUpdatedAt) updates.passwordUpdatedAt = data.createdAt || Date.now();
    if (Object.keys(updates).length > 0) {
      await updateDoc(adminDocRef, updates);
    }
  }
}

/**
 * Get current date string formatted as YYYY-MM-DD in Asia/Dhaka time zone
 */
export function getDhakaDateString(): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const y = parts.find((p) => p.type === "year")?.value || "";
    const m = parts.find((p) => p.type === "month")?.value || "";
    const d = parts.find((p) => p.type === "day")?.value || "";
    return `${y}-${m}-${d}`;
  } catch {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const bd = new Date(utc + 6 * 3600000);
    return bd.toISOString().slice(0, 10);
  }
}

/**
 * Read all users from Firestore 'users' collection
 */
export async function readUsers(): Promise<DatabaseUser[]> {
  const db = getServerDb();
  await ensureDefaultAdmin();

  const snapshot = await getDocs(collection(db, USERS_COLLECTION));
  const users: DatabaseUser[] = [];
  const today = getDhakaDateString();

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const isToday = data.lastScanDate === today;
    users.push({
      id: docSnap.id,
      username: data.username || "",
      name: data.name || "",
      password: data.password || "",
      isAdmin: Boolean(data.isAdmin),
      isBlocked: Boolean(data.isBlocked),
      createdAt: data.createdAt || Date.now(),
      passwordUpdatedAt: data.passwordUpdatedAt || data.createdAt || 0,
      scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
      dailyScanCount: isToday && typeof data.dailyScanCount === "number" ? data.dailyScanCount : 0,
      lastScanDate: data.lastScanDate || "",
      canDeleteRecent: Boolean(data.canDeleteRecent),
      profilePic: data.profilePic || "",
      profilePicChangedByUser: Boolean(data.profilePicChangedByUser),
    });
  });

  return users;
}

/**
 * Write/update a single user document in Firestore
 */
export async function writeUser(user: DatabaseUser): Promise<void> {
  const db = getServerDb();
  const userDocRef = doc(db, USERS_COLLECTION, user.id);
  await setDoc(userDocRef, {
    id: user.id,
    username: user.username,
    name: user.name || "",
    password: user.password || "",
    isAdmin: Boolean(user.isAdmin),
    isBlocked: Boolean(user.isBlocked),
    createdAt: user.createdAt || Date.now(),
    passwordUpdatedAt: user.passwordUpdatedAt || user.createdAt || Date.now(),
    scanCount: typeof user.scanCount === "number" ? user.scanCount : 0,
    dailyScanCount: typeof user.dailyScanCount === "number" ? user.dailyScanCount : 0,
    lastScanDate: user.lastScanDate || "",
    canDeleteRecent: Boolean(user.canDeleteRecent),
    profilePic: user.profilePic || "",
    profilePicChangedByUser: Boolean(user.profilePicChangedByUser),
  });
}

/**
 * Delete a user document from Firestore
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getServerDb();
  await deleteDoc(doc(db, USERS_COLLECTION, userId));
}

/**
 * Find a user by username (case-insensitive lookup)
 */
export async function findUserByUsername(username: string): Promise<DatabaseUser | null> {
  const db = getServerDb();
  // Firestore doesn't support case-insensitive queries natively,
  // so we fetch all and filter (user count is typically small)
  const users = await readUsers();
  return users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || null;
}

/**
 * Find a user by their document ID
 */
export async function findUserById(userId: string): Promise<DatabaseUser | null> {
  const db = getServerDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
  if (!snap.exists()) return null;

  const data = snap.data();
  const today = getDhakaDateString();
  const isToday = data.lastScanDate === today;
  return {
    id: snap.id,
    username: data.username || "",
    name: data.name || "",
    password: data.password || "",
    isAdmin: Boolean(data.isAdmin),
    isBlocked: Boolean(data.isBlocked),
    createdAt: data.createdAt || Date.now(),
    passwordUpdatedAt: data.passwordUpdatedAt || data.createdAt || 0,
    scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
    dailyScanCount: isToday && typeof data.dailyScanCount === "number" ? data.dailyScanCount : 0,
    lastScanDate: data.lastScanDate || "",
    canDeleteRecent: Boolean(data.canDeleteRecent),
    profilePic: data.profilePic || "",
    profilePicChangedByUser: Boolean(data.profilePicChangedByUser),
  };
}



/**
 * Increment scan count for a user (both lifetime total and daily scan count)
 */
export async function incrementUserScanCount(userIdOrUsername: string, count = 1): Promise<void> {
  const users = await readUsers();
  const target = users.find(
    (u) => u.id === userIdOrUsername || u.username.toLowerCase() === userIdOrUsername.toLowerCase()
  );
  if (target) {
    const today = getDhakaDateString();
    
    // Lifetime total scans (retained permanently for Admin Panel & user records)
    target.scanCount = (target.scanCount || 0) + count;

    // Daily scan count (resets to count on date change)
    if (target.lastScanDate === today) {
      target.dailyScanCount = (target.dailyScanCount || 0) + count;
    } else {
      target.lastScanDate = today;
      target.dailyScanCount = count;
    }

    await writeUser(target);
  }
}

// ============================================================
// SYSTEM CONFIG OPERATIONS
// ============================================================

/**
 * Read the global system config from Firestore
 */
export async function readSystemConfig(): Promise<SystemConfig> {
  const db = getServerDb();
  const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);

  try {
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        scanningEnabled: data.scanningEnabled !== false,
        noticeMessage: data.noticeMessage || "System operational.",
        allowUserDeleteRecent: Boolean(data.allowUserDeleteRecent),
        hideRecentScans: Boolean(data.hideRecentScans),
        showActiveUsersTicker: data.showActiveUsersTicker !== false,
      };
    }
  } catch (err) {
    console.warn("[Store] Failed to read system config:", err);
  }

  // Default config if not found
  const defaultConfig: SystemConfig = {
    scanningEnabled: true,
    noticeMessage: "System operational.",
    allowUserDeleteRecent: false,
    hideRecentScans: false,
    showActiveUsersTicker: true,
  };

  // Seed default config
  try {
    await setDoc(configRef, defaultConfig);
  } catch {
    // ignore seed errors
  }

  return defaultConfig;
}

/**
 * Write/update the global system config in Firestore
 */
export async function writeSystemConfig(config: SystemConfig): Promise<void> {
  const db = getServerDb();
  const configRef = doc(db, CONFIG_COLLECTION, CONFIG_DOC_ID);
  await setDoc(configRef, {
    scanningEnabled: config.scanningEnabled,
    noticeMessage: config.noticeMessage || "",
    allowUserDeleteRecent: Boolean(config.allowUserDeleteRecent),
    hideRecentScans: Boolean(config.hideRecentScans),
    showActiveUsersTicker: config.showActiveUsersTicker !== false,
  });
}

/**
 * Get the admin username from environment
 */
export function getAdminUsername(): string {
  return getAdminCredentials().username;
}

// ============================================================
// RECENT SCANS OPERATIONS
// ============================================================

/**
 * Save a recent scan record in Firestore
 */
export async function saveRecentScan(record: RecentScanRecord): Promise<void> {
  const db = getServerDb();
  const scanDocRef = doc(db, RECENT_SCANS_COLLECTION, record.id);
  await setDoc(scanDocRef, {
    id: record.id,
    title: record.title || "NID Scan",
    userId: record.userId || "",
    username: record.username || "",
    userDisplayName: record.userDisplayName || "",
    createdAt: record.createdAt || Date.now(),
    totalMembers: record.totalMembers || (record.members ? record.members.length : 1),
    members: record.members || [],
  });
}

/**
 * Read recent scans from Firestore, sorted by newest first
 */
export async function readRecentScans(limitCount = 100): Promise<RecentScanRecord[]> {
  const db = getServerDb();
  const snapshot = await getDocs(collection(db, RECENT_SCANS_COLLECTION));
  const records: RecentScanRecord[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    records.push({
      id: docSnap.id,
      title: data.title || "NID Scan",
      userId: data.userId || "",
      username: data.username || "",
      userDisplayName: data.userDisplayName || "",
      createdAt: data.createdAt || 0,
      totalMembers: data.totalMembers || (data.members ? data.members.length : 1),
      members: data.members || [],
    });
  });

  // Sort descending by creation date
  records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  if (limitCount > 0 && records.length > limitCount) {
    return records.slice(0, limitCount);
  }

  return records;
}

/**
 * Delete a single recent scan record
 */
export async function deleteRecentScan(id: string): Promise<void> {
  const db = getServerDb();
  await deleteDoc(doc(db, RECENT_SCANS_COLLECTION, id));
}

/**
 * Delete all recent scan records for a specific user
 */
export async function deleteRecentScansForUser(userIdOrUsername: string): Promise<number> {
  const db = getServerDb();
  const allScans = await readRecentScans(0);
  const userScans = allScans.filter(
    (s) =>
      (s.userId && s.userId === userIdOrUsername) ||
      (s.username && s.username.toLowerCase() === userIdOrUsername.toLowerCase())
  );

  let deletedCount = 0;
  for (const scan of userScans) {
    await deleteDoc(doc(db, RECENT_SCANS_COLLECTION, scan.id));
    deletedCount++;
  }

  return deletedCount;
}

// ============================================================
// CHAT & MESSAGING OPERATIONS
// ============================================================

const CHAT_CACHE_FILE = path.join(process.cwd(), "data", "chats_cache.json");

interface ChatCacheData {
  conversations: Record<string, ChatConversation>;
  messages: Record<string, ChatMessage[]>;
}

function readChatCache(): ChatCacheData {
  try {
    if (fs.existsSync(CHAT_CACHE_FILE)) {
      const raw = fs.readFileSync(CHAT_CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn("[Store] Error reading chat cache file:", err);
  }
  return { conversations: {}, messages: {} };
}

function writeChatCache(data: ChatCacheData): void {
  try {
    const dir = path.dirname(CHAT_CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHAT_CACHE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.warn("[Store] Error writing chat cache file:", err);
  }
}

/**
 * Normalize phone numbers to standard format for flexible user search
 */
export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length === 13) {
    return digits.substring(2); // 88017... -> 017...
  }
  if (digits.length === 10 && digits.startsWith("1")) {
    return "0" + digits; // 17... -> 017...
  }
  return digits || raw.trim().toLowerCase();
}

/**
 * Find user by phone number (username), user ID, or display name
 */
export async function findUserByNumberOrId(queryStr: string): Promise<DatabaseUser | null> {
  const clean = (queryStr || "").trim().toLowerCase();
  if (!clean) return null;
  const normalized = normalizePhone(clean);
  const users = await readUsers();

  return (
    users.find((u) => {
      const uUsername = (u.username || "").toLowerCase();
      const uNorm = normalizePhone(uUsername);
      const uId = (u.id || "").toLowerCase();
      const uName = (u.name || "").toLowerCase();

      return (
        uUsername === clean ||
        uNorm === normalized ||
        uId === clean ||
        uName === clean
      );
    }) || null
  );
}

/**
 * Get all conversations for a specific user (Strictly private: only returns conversations where user is participant)
 */
export async function getConversationsForUser(
  userId: string,
  username?: string
): Promise<ChatConversation[]> {
  const db = getServerDb();
  const cache = readChatCache();
  const cleanUsername = (username || "").toLowerCase();

  const convList: ChatConversation[] = [];

  try {
    const snap = await getDocs(collection(db, CONVERSATIONS_COLLECTION));
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ChatConversation;
      const participants = data.participants || [];
      const participantUsernames = (data.participantUsernames || []).map((u) => u.toLowerCase());

      const isParticipant =
        participants.includes(userId) ||
        (cleanUsername && participantUsernames.includes(cleanUsername));

      if (isParticipant) {
        convList.push({
          id: docSnap.id,
          participants: data.participants || [],
          participantUsernames: data.participantUsernames || [],
          participantDetails: data.participantDetails || {},
          lastMessage: data.lastMessage || null,
          createdAt: data.createdAt || Date.now(),
          updatedAt: data.updatedAt || Date.now(),
        });
      }
    });
  } catch (err) {
    console.warn("[Store] Error fetching conversations from Firestore, using cache:", err);
    Object.values(cache.conversations).forEach((c) => {
      const isParticipant =
        c.participants.includes(userId) ||
        (cleanUsername && c.participantUsernames.map((u) => u.toLowerCase()).includes(cleanUsername));
      if (isParticipant) {
        convList.push(c);
      }
    });
  }

  // Calculate unread count for each conversation
  for (const conv of convList) {
    let unread = 0;
    try {
      const msgs = await getMessagesForConversation(conv.id, userId, username);
      unread = msgs.filter((m) => m.recipientId === userId && !m.seen).length;
    } catch {
      // ignore
    }
    conv.unreadCount = unread;
  }

  // Sort by updatedAt descending
  convList.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return convList;
}

/**
 * Create or retrieve an existing conversation between two users
 */
export async function createOrGetConversation(
  user1: DatabaseUser,
  user2: DatabaseUser
): Promise<ChatConversation> {
  const db = getServerDb();
  const cache = readChatCache();

  // Deterministic ID so A & B always share the exact same conversation
  const sortedIds = [user1.id, user2.id].sort();
  const convId = "conv_" + sortedIds.join("__");

  const participantDetails: Record<string, ChatParticipant> = {
    [user1.id]: {
      id: user1.id,
      username: user1.username,
      name: user1.name || user1.username,
      profilePic: user1.profilePic || "",
    },
    [user2.id]: {
      id: user2.id,
      username: user2.username,
      name: user2.name || user2.username,
      profilePic: user2.profilePic || "",
    },
  };

  const convDocRef = doc(db, CONVERSATIONS_COLLECTION, convId);

  try {
    const snap = await getDoc(convDocRef);
    if (snap.exists()) {
      const data = snap.data() as ChatConversation;
      // Refresh participant details (e.g. if name or profile pic updated)
      await updateDoc(convDocRef, { participantDetails });
      const updatedConv: ChatConversation = {
        ...data,
        participantDetails,
      };
      cache.conversations[convId] = updatedConv;
      writeChatCache(cache);
      return updatedConv;
    }
  } catch (err) {
    console.warn("[Store] Error checking conversation in Firestore:", err);
  }

  const newConv: ChatConversation = {
    id: convId,
    participants: [user1.id, user2.id],
    participantUsernames: [user1.username, user2.username],
    participantDetails,
    lastMessage: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  try {
    await setDoc(convDocRef, newConv);
  } catch (err) {
    console.warn("[Store] Failed to write new conversation to Firestore:", err);
  }

  cache.conversations[convId] = newConv;
  writeChatCache(cache);

  return newConv;
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(convId: string): Promise<ChatConversation | null> {
  const db = getServerDb();
  const cache = readChatCache();

  try {
    const snap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, convId));
    if (snap.exists()) {
      return snap.data() as ChatConversation;
    }
  } catch (err) {
    console.warn("[Store] Error fetching conv by ID from Firestore:", err);
  }

  return cache.conversations[convId] || null;
}

/**
 * Get all messages for a conversation (PRIVACY ENFORCED: user must be participant)
 */
export async function getMessagesForConversation(
  convId: string,
  userId: string,
  username?: string
): Promise<ChatMessage[]> {
  const conv = await getConversationById(convId);
  if (!conv) {
    throw new Error("Conversation not found");
  }

  const cleanUsername = (username || "").toLowerCase();
  const isParticipant =
    conv.participants.includes(userId) ||
    (cleanUsername && conv.participantUsernames.map((u) => u.toLowerCase()).includes(cleanUsername));

  if (!isParticipant) {
    throw new Error("Access denied: You are not authorized to view this private chat.");
  }

  const db = getServerDb();
  const cache = readChatCache();
  const messages: ChatMessage[] = [];

  try {
    const msgsRef = collection(db, CONVERSATIONS_COLLECTION, convId, "messages");
    const snap = await getDocs(msgsRef);
    snap.forEach((docSnap) => {
      const data = docSnap.data() as ChatMessage;
      messages.push({
        id: docSnap.id,
        conversationId: convId,
        senderId: data.senderId,
        senderName: data.senderName,
        recipientId: data.recipientId,
        text: data.text,
        messageType: data.messageType || (data.text?.startsWith("[sticker:") ? "sticker" : "text"),
        createdAt: data.createdAt || Date.now(),
        seen: Boolean(data.seen),
        seenAt: data.seenAt || null,
      });
    });
  } catch (err) {
    console.warn("[Store] Error fetching messages from Firestore, using cache:", err);
    if (cache.messages[convId]) {
      return [...cache.messages[convId]].sort((a, b) => a.createdAt - b.createdAt);
    }
  }

  // Sort ascending by time
  messages.sort((a, b) => a.createdAt - b.createdAt);

  // Update cache
  cache.messages[convId] = messages;
  writeChatCache(cache);

  return messages;
}

/**
 * Send a message in a conversation
 */
export async function sendChatMessage(
  convId: string,
  senderId: string,
  text: string,
  messageType: "text" | "sticker" = "text"
): Promise<ChatMessage> {
  const conv = await getConversationById(convId);
  if (!conv) {
    throw new Error("Conversation not found");
  }

  if (!conv.participants.includes(senderId)) {
    throw new Error("Access denied: You are not a participant in this conversation.");
  }

  // Recipient is the other participant
  const recipientId = conv.participants.find((p) => p !== senderId) || "";
  const senderDetail = conv.participantDetails[senderId];
  const senderName = senderDetail?.name || senderDetail?.username || "User";

  const msgId = "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
  const now = Date.now();
  const summaryText = messageType === "sticker" ? "🎨 [স্টিকার]" : text.trim();

  const newMsg: ChatMessage = {
    id: msgId,
    conversationId: convId,
    senderId,
    senderName,
    recipientId,
    text: text.trim(),
    messageType,
    createdAt: now,
    seen: false,
    seenAt: null,
  };

  const db = getServerDb();
  const cache = readChatCache();

  try {
    const msgDocRef = doc(db, CONVERSATIONS_COLLECTION, convId, "messages", msgId);
    await setDoc(msgDocRef, newMsg);

    // Update conversation lastMessage
    const convDocRef = doc(db, CONVERSATIONS_COLLECTION, convId);
    await updateDoc(convDocRef, {
      lastMessage: {
        text: summaryText,
        senderId,
        createdAt: now,
        seen: false,
      },
      updatedAt: now,
    });
  } catch (err) {
    console.warn("[Store] Error saving message to Firestore:", err);
  }

  // Update cache
  if (!cache.messages[convId]) {
    cache.messages[convId] = [];
  }
  cache.messages[convId].push(newMsg);
  if (cache.conversations[convId]) {
    cache.conversations[convId].lastMessage = {
      text: summaryText,
      senderId,
      createdAt: now,
      seen: false,
    };
    cache.conversations[convId].updatedAt = now;
  }
  writeChatCache(cache);

  return newMsg;
}

/**
 * Mark messages in a conversation as seen (WhatsApp double tick trigger)
 */
export async function markConversationAsSeen(
  convId: string,
  readerId: string
): Promise<number> {
  const conv = await getConversationById(convId);
  if (!conv || !conv.participants.includes(readerId)) {
    return 0;
  }

  const db = getServerDb();
  const cache = readChatCache();
  const now = Date.now();
  let updatedCount = 0;

  try {
    const msgsRef = collection(db, CONVERSATIONS_COLLECTION, convId, "messages");
    const snap = await getDocs(msgsRef);

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      // Only mark messages sent TO readerId that are not seen yet
      if (data.recipientId === readerId && !data.seen) {
        await updateDoc(docSnap.ref, {
          seen: true,
          seenAt: now,
        });
        updatedCount++;
      }
    }

    // Update lastMessage seen if it was sent by someone else
    if (conv.lastMessage && conv.lastMessage.senderId !== readerId) {
      const convDocRef = doc(db, CONVERSATIONS_COLLECTION, convId);
      await updateDoc(convDocRef, {
        "lastMessage.seen": true,
      });
    }
  } catch (err) {
    console.warn("[Store] Error updating seen status in Firestore:", err);
  }

  // Update cache
  if (cache.messages[convId]) {
    cache.messages[convId].forEach((m) => {
      if (m.recipientId === readerId && !m.seen) {
        m.seen = true;
        m.seenAt = now;
        updatedCount++;
      }
    });
  }
  if (cache.conversations[convId]?.lastMessage && cache.conversations[convId].lastMessage?.senderId !== readerId) {
    cache.conversations[convId].lastMessage!.seen = true;
  }
  writeChatCache(cache);

  return updatedCount;
}

/**
 * Get total unread message count for a user across all chats
 */
export async function getTotalUnreadCountForUser(
  userId: string,
  username?: string
): Promise<number> {
  const conversations = await getConversationsForUser(userId, username);
  return conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
}


