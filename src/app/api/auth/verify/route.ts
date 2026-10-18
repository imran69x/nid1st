import { NextRequest, NextResponse } from "next/server";
import { findUserById, findUserByUsername } from "@/lib/server/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const pwTimeStr = searchParams.get("pwTime");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        {
          status: 400,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    let user = await findUserById(userId);
    if (!user) {
      user = await findUserByUsername(userId);
    }

    if (!user) {
      return NextResponse.json(
        {
          valid: false,
          reason: "user_not_found",
          message: "User account no longer exists. Please contact administrator.",
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const serverPwTime = user.passwordUpdatedAt || user.createdAt || 0;
    const clientPwTime = pwTimeStr ? Number(pwTimeStr) : 0;

    // Check if password has been changed by admin
    if (clientPwTime > 0 && serverPwTime > 0 && serverPwTime !== clientPwTime) {
      return NextResponse.json(
        {
          valid: false,
          reason: "password_changed",
          message: "Your password was changed by admin. Please login again.",
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    // Check if user is locked/blocked
    if (user.isBlocked) {
      return NextResponse.json(
        {
          valid: true,
          isBlocked: true,
          message: "Your account is locked. Please contact developer.",
          user: {
            id: user.id,
            username: user.username,
            isAdmin: Boolean(user.isAdmin),
            isBlocked: true,
            passwordUpdatedAt: serverPwTime,
          },
        },
        {
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        isBlocked: false,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: Boolean(user.isAdmin),
          isBlocked: false,
          passwordUpdatedAt: serverPwTime,
        },
      },
      {
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch (err: any) {
    console.error("[Auth Verify GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify session" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
