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

