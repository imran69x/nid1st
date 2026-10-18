import { NextRequest, NextResponse } from "next/server";
import { readUsers, getAdminUsername } from "@/lib/server/store";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "User ID and password are required." },
        { status: 400 }
      );
    }

    const cleanUsername = String(username).trim().toLowerCase();
    const cleanPassword = String(password).trim();

    // Fetch all users from Firestore (includes seeded admin)
    const users = await readUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user || user.password !== cleanPassword) {
      return NextResponse.json(
        { error: "Invalid User ID or Password" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Your account is locked. Please contact developer." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: Boolean(user.isAdmin),
        isBlocked: false,
        createdAt: user.createdAt,
        passwordUpdatedAt: user.passwordUpdatedAt || user.createdAt || 0,
        scanCount: user.scanCount || 0,
      },
    });
  } catch (err: any) {
    console.error("[Login API] Error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
