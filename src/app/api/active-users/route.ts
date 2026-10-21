import { NextResponse } from "next/server";
import { readUsers } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await readUsers();
    // Filter out blocked users and map sanitized public user profile
    const activeList = allUsers
      .filter((u) => !u.isBlocked)
      .map((u) => ({
        id: u.id,
        name: u.name || u.username || "Member",
        profilePic: u.profilePic || "",
        scanCount: typeof u.scanCount === "number" ? u.scanCount : 0,
        isAdmin: Boolean(u.isAdmin),
      }))
      .sort((a, b) => b.scanCount - a.scanCount);

    return NextResponse.json({
      success: true,
      users: activeList,
    });
  } catch (err: any) {
    console.error("[Active Users GET] Error:", err);
    return NextResponse.json({ success: false, users: [] }, { status: 500 });
  }
}
