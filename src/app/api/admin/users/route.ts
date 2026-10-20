import { NextRequest, NextResponse } from "next/server";
import {
  readUsers,
  writeUser,
  deleteUser,
  findUserByUsername,
  findUserById,
  getAdminUsername,
} from "@/lib/server/store";
import { DatabaseUser } from "@/types/user";

// GET: Fetch all users from Firestore
export async function GET() {
  try {
    const users = await readUsers();
    return NextResponse.json({ users });
  } catch (err: any) {
    console.error("[Admin Users GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load users" },
      { status: 500 }
    );
  }
}

// POST: Create a new user in Firestore
export async function POST(req: NextRequest) {
  try {
    const { username, name, password, isAdmin } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "User ID and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
    const cleanName = name && String(name).trim() ? String(name).trim() : cleanUsername;
    const cleanPassword = String(password).trim();

    // Check if username already exists
    const existingUser = await findUserByUsername(cleanUsername);
    if (existingUser) {
      return NextResponse.json(
        { error: "User ID already exists." },
        { status: 400 }
      );
    }

    const newUser: DatabaseUser = {
      id: "usr_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      name: cleanName,
      password: cleanPassword,
      isAdmin: Boolean(isAdmin),
      isBlocked: false,
      createdAt: Date.now(),
      passwordUpdatedAt: Date.now(),
      scanCount: 0,
    };

    // Write to Firestore
    await writeUser(newUser);

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    console.error("[Admin Users POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

// PUT: Update user details (Name, Username, Password, Profile Picture) by Admin
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, username, password, newPassword, profilePic, resetPicChangeCount } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      );
    }

    // Try to find user by ID first, then by username
    let targetUser = await findUserById(userId);
    if (!targetUser) {
      targetUser = await findUserByUsername(userId);
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // 1. Update Name if provided
    if (name !== undefined) {
      targetUser.name = String(name).trim();
    }

    // 2. Update Username (Login ID) if provided and changed
    if (username !== undefined) {
      const cleanUsername = String(username).trim();
      if (!cleanUsername) {
        return NextResponse.json({ error: "User ID cannot be empty." }, { status: 400 });
      }
      if (cleanUsername.toLowerCase() !== targetUser.username.toLowerCase()) {
        const existing = await findUserByUsername(cleanUsername);
        if (existing && existing.id !== targetUser.id) {
          return NextResponse.json(
            { error: "This User ID is already taken by another user." },
            { status: 400 }
          );
        }
        targetUser.username = cleanUsername;
      }
    }

    // 3. Update Password if provided
    const passToUpdate = password || newPassword;
    if (passToUpdate !== undefined && String(passToUpdate).trim() !== "") {
      const cleanPassword = String(passToUpdate).trim();
      if (cleanPassword.length < 3) {
        return NextResponse.json(
          { error: "Password must be at least 3 characters." },
          { status: 400 }
        );
      }
      targetUser.password = cleanPassword;
      targetUser.passwordUpdatedAt = Date.now();
    }

    // 4. Update Profile Picture if provided
    if (profilePic !== undefined) {
      targetUser.profilePic = typeof profilePic === "string" ? profilePic : "";
    }

    // 5. Option to reset user's 1-time profile picture change restriction
    if (resetPicChangeCount === true) {
      targetUser.profilePicChangedByUser = false;
    }

    await writeUser(targetUser);

    return NextResponse.json({
      success: true,
      message: `User '${targetUser.name || targetUser.username}' updated successfully`,
      user: targetUser,
    });
  } catch (err: any) {
    console.error("[Admin Users PUT] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update user" },
      { status: 500 }
    );
  }
}

// PATCH: Toggle block/lock status OR toggle canDeleteRecent permission
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, isBlocked, canDeleteRecent, allUsers } = body;

    // Bulk toggle delete permission for all non-admin users
    if (allUsers && typeof canDeleteRecent === "boolean") {
      const users = await readUsers();
      for (const u of users) {
        if (!u.isAdmin) {
          u.canDeleteRecent = canDeleteRecent;
          await writeUser(u);
        }
      }
      return NextResponse.json({
        success: true,
        message: canDeleteRecent
          ? "All users have been granted recent scan delete permission."
          : "Recent scan delete permission revoked for all users.",
      });
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    // Try to find user by ID first, then by username
    let targetUser = await findUserById(userId);
    if (!targetUser) {
      targetUser = await findUserByUsername(userId);
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (typeof isBlocked === "boolean") {
      const adminUsername = getAdminUsername();
      if (targetUser.username === adminUsername) {
        return NextResponse.json(
          { error: "Cannot block main admin user." },
          { status: 400 }
        );
      }
      targetUser.isBlocked = Boolean(isBlocked);
    }

    if (typeof canDeleteRecent === "boolean") {
      targetUser.canDeleteRecent = Boolean(canDeleteRecent);
    }

    await writeUser(targetUser);

    return NextResponse.json({ success: true, user: targetUser });
  } catch (err: any) {
    console.error("[Admin Users PATCH] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update user status" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // Find the user first
    let targetUser = await findUserById(userId);
    if (!targetUser) {
      targetUser = await findUserByUsername(userId);
    }

    const adminUsername = getAdminUsername();
    if (targetUser?.username === adminUsername) {
      return NextResponse.json(
        { error: "Cannot delete main admin user." },
        { status: 400 }
      );
    }

    if (targetUser) {
      await deleteUser(targetUser.id);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[Admin Users DELETE] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
