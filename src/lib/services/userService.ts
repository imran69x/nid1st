import { DatabaseUser, SystemConfig, RecentScanRecord } from "@/types/user";

export const SESSION_STORAGE_KEY = "nid_db_active_user";

/**
 * Save user in session/localStorage
 */
export function saveSession(user: DatabaseUser) {
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  }
}

/**
 * Retrieve currently logged in database user
 */
export function getActiveSession(): DatabaseUser | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Clear session
 */
export function clearSession() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

/**
 * Login user via backend API verification
 */
export async function loginWithDatabase(
  username: string,
  password: string
): Promise<DatabaseUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Login failed");
  }

  saveSession(data.user);
  return data.user;
}

/**
 * Fetch all database users (Admin only)
 */
export async function getAllUsers(): Promise<DatabaseUser[]> {
  const res = await fetch("/api/admin/users");
  if (!res.ok) {
    throw new Error("Failed to load users");
  }
  const data = await res.json();
  return data.users || [];
}

/**
 * Create a new user (Admin only)
 */
export async function createUserByAdmin(
  userData: Omit<DatabaseUser, "id" | "createdAt">
): Promise<DatabaseUser> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to create user");
  }
  return data.user;
}

/**
 * Toggle user lock/block status (Admin only)
 */
export async function toggleUserBlockStatus(userId: string, isBlocked: boolean): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, isBlocked }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update user status");
  }
}

/**
 * Change password for any user or admin
 */
export async function changeUserPassword(userId: string, newPassword: string): Promise<any> {
  const res = await fetch("/api/admin/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to change password");
  }
  return data.user;
}

/**
 * Delete a user (Admin only)
 */
export async function deleteUserByAdmin(userId: string): Promise<void> {
  const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete user");
  }
}

/**
 * Get system config (e.g. scanning on/off)
 */
export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    const res = await fetch("/api/admin/system");
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }
  return { scanningEnabled: true };
}

/**
 * Update system config (Admin only)
 */
export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<void> {
  const res = await fetch("/api/admin/system", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update system config");
  }
}

export async function ensureDefaultAdminExists(): Promise<void> {
  // Handled automatically by server store
}

/**
 * Fetch recent scans
 * - Regular/personal view (/recent): caller only gets their own scans
 * - Admin master view (all=true): Admin gets all users' scans
 */
export async function getRecentScans(
  callerId?: string,
  targetUserId?: string,
  all?: boolean
): Promise<RecentScanRecord[]> {
  const params = new URLSearchParams();
  if (callerId) params.set("callerId", callerId);
  if (targetUserId) params.set("userId", targetUserId);
  if (all) params.set("all", "true");
  const url = params.toString() ? `/api/recent?${params.toString()}` : "/api/recent";

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to load recent scans");
  }
  const data = await res.json();
  return data.scans || [];
}

/**
 * Save a new scan to recent scans collection
 */
export async function saveRecentScanToDatabase(
  scanData: Partial<RecentScanRecord>
): Promise<RecentScanRecord> {
  const res = await fetch("/api/recent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scanData),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to save scan record");
  }
  return data.record;
}

/**
 * Delete a single recent scan
 */
export async function deleteRecentScanRecord(
  scanId: string,
  callerId: string
): Promise<void> {
  const res = await fetch(
    `/api/recent?id=${encodeURIComponent(scanId)}&callerId=${encodeURIComponent(
      callerId
    )}`,
    {
      method: "DELETE",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete scan record");
  }
}

/**
 * Delete all recent scans for a specific user
 */
export async function deleteAllRecentScansForUser(
  targetUserId: string,
  callerId: string
): Promise<number> {
  const res = await fetch(
    `/api/recent?clearUser=${encodeURIComponent(targetUserId)}&callerId=${encodeURIComponent(
      callerId
    )}`,
    {
      method: "DELETE",
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to delete user scans");
  }
  return data.deletedCount || 0;
}

// Keep backward-compatibility alias
export const deleteRecentScanByAdmin = deleteRecentScanRecord;

/**
 * Toggle user recent delete permission (Admin only)
 */
export async function toggleUserRecentDeletePermission(
  userId: string,
  canDeleteRecent: boolean
): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, canDeleteRecent }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update user permission");
  }
}

/**
 * Toggle recent delete permission for ALL non-admin users at once (Admin only)
 */
export async function toggleAllUsersRecentDeletePermission(
  canDeleteRecent: boolean
): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ allUsers: true, canDeleteRecent }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update permissions");
  }
}

/**
 * Update user details by Admin (Name, User ID, Password, Profile Picture)
 */
export async function updateUserByAdmin(
  userId: string,
  data: {
    name?: string;
    username?: string;
    password?: string;
    profilePic?: string;
    resetPicChangeCount?: boolean;
  }
): Promise<DatabaseUser> {
  const res = await fetch("/api/admin/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, ...data }),
  });

  const resData = await res.json();
  if (!res.ok) {
    throw new Error(resData.error || "Failed to update user");
  }
  return resData.user;
}

/**
 * Update user's own profile picture (1-time only for regular users, unlimited for admin)
 */
export async function updateUserProfilePic(
  userId: string,
  profilePic: string
): Promise<DatabaseUser> {
  const res = await fetch("/api/user/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, profilePic }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update profile picture");
  }
  return data.user;
}

/**
 * Browser-side canvas resize to create a lightweight, high-quality round avatar (approx 20-30KB)
 */
export async function resizeImageToAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;

        // Calculate aspect-filling square crop
        const minDim = Math.min(width, height);
        const startX = (width - minDim) / 2;
        const startY = (height - minDim) / 2;

        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context unavailable"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, MAX_SIZE, MAX_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Image failed to load"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("File failed to read"));
    reader.readAsDataURL(file);
  });
}



