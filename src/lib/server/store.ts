import fs from "fs";
import path from "path";
import os from "os";
import { DatabaseUser, SystemConfig } from "@/types/user";

// Use OS temp directory (writable on Vercel serverless /tmp and locally)
const DATA_DIR = path.join(os.tmpdir(), "nid_scanner_data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

// In-memory fallback cache
let inMemoryUsers: DatabaseUser[] = [
  {
    id: "admin_01706338181",
    username: "01706338181",
    password: "8181",
    isAdmin: true,
    isBlocked: false,
    createdAt: Date.now(),
    scanCount: 0,
  },
];

let inMemoryConfig: SystemConfig = {
  scanningEnabled: true,
  noticeMessage: "System operational.",
};

function ensureDataFiles() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(inMemoryUsers, null, 2), "utf-8");
    } else {
      try {
        const users: DatabaseUser[] = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
        const adminIdx = users.findIndex((u) => u.username === "01706338181");
        if (adminIdx >= 0) {
          users[adminIdx].isAdmin = true;
          users[adminIdx].isBlocked = false;
          if (typeof users[adminIdx].scanCount !== "number") {
            users[adminIdx].scanCount = 0;
          }
        } else {
          users.unshift(inMemoryUsers[0]);
        }
        inMemoryUsers = users;
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
      } catch {
        // ignore parse errors
      }
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(inMemoryConfig, null, 2), "utf-8");
    }
  } catch (err) {
    console.warn("Storage filesystem notice (using in-memory store):", err);
  }
}

export function readUsers(): DatabaseUser[] {
  try {
    ensureDataFiles();
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf-8");
      const list: DatabaseUser[] = JSON.parse(data);
      inMemoryUsers = list.map((u) => ({
        ...u,
        scanCount: typeof u.scanCount === "number" ? u.scanCount : 0,
      }));
      return inMemoryUsers;
    }
  } catch {
    // fallback to inMemoryUsers
  }
  return inMemoryUsers;
}

export function writeUsers(users: DatabaseUser[]) {
  inMemoryUsers = users;
  try {
    ensureDataFiles();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write to file, kept in memory:", err);
  }
}

export function incrementUserScanCount(userIdOrUsername: string, count = 1) {
  const users = readUsers();
  const target = users.find(
    (u) => u.id === userIdOrUsername || u.username.toLowerCase() === userIdOrUsername.toLowerCase()
  );
  if (target) {
    target.scanCount = (target.scanCount || 0) + count;
    writeUsers(users);
  }
}

export function readSystemConfig(): SystemConfig {
  try {
    ensureDataFiles();
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, "utf-8");
      inMemoryConfig = JSON.parse(data);
      return inMemoryConfig;
    }
  } catch {
    // fallback
  }
  return inMemoryConfig;
}

export function writeSystemConfig(config: SystemConfig) {
  inMemoryConfig = config;
  try {
    ensureDataFiles();
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write config, kept in memory:", err);
  }
}
