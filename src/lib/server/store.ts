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
import { DatabaseUser, SystemConfig } from "@/types/user";

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
      password: password,
      isAdmin: true,
      isBlocked: false,
      createdAt: Date.now(),
      scanCount: 0,
    };
    await setDoc(adminDocRef, adminUser);
    console.log("[Store] Default admin user seeded into Firestore:", username);
  } else {
    // Ensure admin flags and password are valid
    const data = adminSnap.data();
    const updates: Partial<DatabaseUser> = {};
    if (!data.isAdmin) updates.isAdmin = true;
    if (data.isBlocked) updates.isBlocked = false;
    if (!data.password && password) updates.password = password;
    if (Object.keys(updates).length > 0) {
      await updateDoc(adminDocRef, updates);
    }
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

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    users.push({
      id: docSnap.id,
      username: data.username || "",
      password: data.password || "",
      isAdmin: Boolean(data.isAdmin),
      isBlocked: Boolean(data.isBlocked),
      createdAt: data.createdAt || Date.now(),
      scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
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
    password: user.password || "",
    isAdmin: Boolean(user.isAdmin),
    isBlocked: Boolean(user.isBlocked),
    createdAt: user.createdAt || Date.now(),
    scanCount: typeof user.scanCount === "number" ? user.scanCount : 0,
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
  return {
    id: snap.id,
    username: data.username || "",
    password: data.password || "",
    isAdmin: Boolean(data.isAdmin),
    isBlocked: Boolean(data.isBlocked),
    createdAt: data.createdAt || Date.now(),
    scanCount: typeof data.scanCount === "number" ? data.scanCount : 0,
  };
}

/**
 * Increment scan count for a user
 */
export async function incrementUserScanCount(userIdOrUsername: string, count = 1): Promise<void> {
  const users = await readUsers();
  const target = users.find(
    (u) => u.id === userIdOrUsername || u.username.toLowerCase() === userIdOrUsername.toLowerCase()
  );
  if (target) {
    target.scanCount = (target.scanCount || 0) + count;
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
      };
    }
  } catch (err) {
    console.warn("[Store] Failed to read system config:", err);
  }

  // Default config if not found
  const defaultConfig: SystemConfig = {
    scanningEnabled: true,
    noticeMessage: "System operational.",
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
  });
}

/**
 * Get the admin username from environment
 */
export function getAdminUsername(): string {
  return getAdminCredentials().username;
}
