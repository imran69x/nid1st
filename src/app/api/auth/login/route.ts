import { NextRequest, NextResponse } from "next/server";
import { readUsers } from "@/lib/server/store";

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

    // Direct check for main admin default credentials
    if (cleanUsername === "01706338181" && cleanPassword === "8181") {
      return NextResponse.json({
        success: true,
        user: {
          id: "admin_01706338181",
          username: "01706338181",
          isAdmin: true,
          isBlocked: false,
          createdAt: Date.now(),
          scanCount: 0,
        },
      });
    }

    const users = readUsers();
    const user = users.find((u) => u.username.toLowerCase() === cleanUsername);

    if (!user || user.password !== cleanPassword) {
      return NextResponse.json(
        { error: "Invalid User ID or Password" },
        { status: 401 }
      );
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "You are locked/blocked. Please contact our support." },
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
        scanCount: user.scanCount || 0,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
