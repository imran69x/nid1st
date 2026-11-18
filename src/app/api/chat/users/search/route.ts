import { NextRequest, NextResponse } from "next/server";
import { findUserByNumberOrId } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "";
    const currentUserId = searchParams.get("currentUserId") || "";

    if (!query.trim()) {
      return NextResponse.json({ user: null });
    }

    const foundUser = await findUserByNumberOrId(query.trim());
    if (!foundUser) {
      return NextResponse.json({ user: null, message: "User not found" });
    }

    // Do not return password or sensitive data
    return NextResponse.json({
      success: true,
      user: {
        id: foundUser.id,
        username: foundUser.username,
        name: foundUser.name || foundUser.username,
        profilePic: foundUser.profilePic || "",
        isSelf: foundUser.id === currentUserId,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to search user" },
      { status: 500 }
    );
  }
}
