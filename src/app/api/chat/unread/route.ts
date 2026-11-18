import { NextRequest, NextResponse } from "next/server";
import { getTotalUnreadCountForUser } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// GET: Get total unread count for sidebar / header badge
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const username = searchParams.get("username") || undefined;

    if (!userId) {
      return NextResponse.json({ unreadCount: 0 });
    }

    const unreadCount = await getTotalUnreadCountForUser(userId, username);
    return NextResponse.json({ success: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, unreadCount: 0 });
  }
}
