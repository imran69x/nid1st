import { DatabaseUser, SystemConfig } from "@/types/user";

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
export async function changeUserPassword(userId: string, newPassword: string): Promise<void> {
  const res = await fetch("/api/admin/users", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, newPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to change password");
  }
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
