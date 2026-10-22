import { NextResponse } from "next/server";
import { readUsers, getDhakaDateString } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allUsers = await readUsers();
    const today = getDhakaDateString();

    // Filter out blocked users and map sanitized public user profile
    const activeList = allUsers
      .filter((u) => !u.isBlocked)
      .map((u) => {
        // Daily scan count resets automatically when the date changes
        const dailyCount =
          u.lastScanDate === today && typeof u.dailyScanCount === "number"
            ? u.dailyScanCount
            : 0;

        return {
          id: u.id,
          name: u.name || u.username || "Member",
          profilePic: u.profilePic || "",
          dailyScanCount: dailyCount,
          scanCount: dailyCount, // Daily scan count for the active users ticker
          totalScanCount: typeof u.scanCount === "number" ? u.scanCount : 0, // Lifetime total scans
          isAdmin: Boolean(u.isAdmin),
        };
      })
      .sort((a, b) => {
        // Sort users by today's scans first, then by lifetime scans
        if (b.dailyScanCount !== a.dailyScanCount) {
          return b.dailyScanCount - a.dailyScanCount;
        }
        return b.totalScanCount - a.totalScanCount;
      });

    return NextResponse.json({
      success: true,
      today,
      users: activeList,
    });
  } catch (err: any) {
    console.error("[Active Users GET] Error:", err);
    return NextResponse.json({ success: false, users: [] }, { status: 500 });
  }
}
