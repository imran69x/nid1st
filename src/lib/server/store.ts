import fs from "fs";
import path from "path";
import { DatabaseUser, SystemConfig } from "@/types/user";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Ensure default main admin user: 01706338181 / 8181
  if (!fs.existsSync(USERS_FILE)) {
    const defaultUsers: DatabaseUser[] = [
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
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2), "utf-8");
  } else {
    try {
      const users: DatabaseUser[] = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
      const adminIdx = users.findIndex((u) => u.username === "01706338181");
      if (adminIdx >= 0) {
        // preserve existing password, ensure admin status
        users[adminIdx].isAdmin = true;
        users[adminIdx].isBlocked = false;
        if (typeof users[adminIdx].scanCount !== "number") {
          users[adminIdx].scanCount = 0;
        }
      } else {
        users.unshift({
          id: "admin_01706338181",
          username: "01706338181",
          password: "8181",
          isAdmin: true,
          isBlocked: false,
          createdAt: Date.now(),
          scanCount: 0,
        });
      }
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
    } catch {
      // ignore
    }
  }

  if (!fs.existsSync(CONFIG_FILE)) {
    const defaultConfig: SystemConfig = {
      scanningEnabled: true,
      noticeMessage: "System operational.",
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), "utf-8");
  }
}

export function readUsers(): DatabaseUser[] {
  ensureDataFiles();
  try {
    const data = fs.readFileSync(USERS_FILE, "utf-8");
    const list: DatabaseUser[] = JSON.parse(data);
    return list.map((u) => ({
      ...u,
      scanCount: typeof u.scanCount === "number" ? u.scanCount : 0,
    }));
  } catch {
    return [];
  }
}

export function writeUsers(users: DatabaseUser[]) {
  ensureDataFiles();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
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
  ensureDataFiles();
  try {
    const data = fs.readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return { scanningEnabled: true };
  }
}

export function writeSystemConfig(config: SystemConfig) {
  ensureDataFiles();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf-8");
}
