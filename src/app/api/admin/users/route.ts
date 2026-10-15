import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers } from "@/lib/server/store";
import { DatabaseUser } from "@/types/user";

export async function GET() {
  const users = readUsers();
  return NextResponse.json({ users });
}

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

    const users = readUsers();
    if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
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

    users.push(newUser);
    writeUsers(users);

    return NextResponse.json({ success: true, user: newUser });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create user" },
      { status: 500 }
    );
  }
}

// Update password
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

    const users = readUsers();
    const targetUser = users.find((u) => u.id === userId || u.username === userId);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    targetUser.password = cleanPassword;
    writeUsers(users);

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
    return NextResponse.json(
      { error: err.message || "Failed to update password" },
      { status: 500 }
    );
  }
}

// Toggle block/lock
export async function PATCH(req: NextRequest) {
  try {
    const { userId, isBlocked } = await req.json();
    const users = readUsers();

    const targetUser = users.find((u) => u.id === userId || u.username === userId);
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (targetUser.username === "01706338181") {
      return NextResponse.json(
        { error: "Cannot block main admin user." },
        { status: 400 }
      );
    }

    targetUser.isBlocked = Boolean(isBlocked);
    writeUsers(users);

    return NextResponse.json({ success: true, user: targetUser });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to update user status" },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    let users = readUsers();
    const targetUser = users.find((u) => u.id === userId || u.username === userId);
    if (targetUser?.username === "01706338181") {
      return NextResponse.json(
        { error: "Cannot delete main admin user." },
        { status: 400 }
      );
    }

    users = users.filter((u) => u.id !== userId && u.username !== userId);
    writeUsers(users);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to delete user" },
      { status: 500 }
    );
  }
}
