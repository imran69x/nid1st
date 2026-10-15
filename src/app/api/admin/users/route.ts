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
    const { username, password, isAdmin } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "User ID and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim();
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
      password: cleanPassword,
      isAdmin: Boolean(isAdmin),
      isBlocked: false,
      createdAt: Date.now(),
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

// PUT: Update password for a user
export async function PUT(req: NextRequest) {
  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json(
        { error: "User ID and new password are required." },
        { status: 400 }
      );
    }

    const cleanPassword = String(newPassword).trim();
    if (cleanPassword.length < 3) {
      return NextResponse.json(
        { error: "Password must be at least 3 characters." },
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

    targetUser.password = cleanPassword;
    await writeUser(targetUser);

    return NextResponse.json({
      success: true,
      message: `Password updated successfully for ${targetUser.username}`,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        isAdmin: targetUser.isAdmin,
      },
    });
  } catch (err: any) {
    console.error("[Admin Users PUT] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update password" },
      { status: 500 }
    );
  }
}

// PATCH: Toggle block/lock status
export async function PATCH(req: NextRequest) {
  try {
    const { userId, isBlocked } = await req.json();

    // Try to find user by ID first, then by username
    let targetUser = await findUserById(userId);
    if (!targetUser) {
      targetUser = await findUserByUsername(userId);
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const adminUsername = getAdminUsername();
    if (targetUser.username === adminUsername) {
      return NextResponse.json(
        { error: "Cannot block main admin user." },
        { status: 400 }
      );
    }

    targetUser.isBlocked = Boolean(isBlocked);
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
