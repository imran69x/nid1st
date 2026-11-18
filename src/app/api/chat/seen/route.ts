import { NextRequest, NextResponse } from "next/server";
import { markConversationAsSeen } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// POST: Mark messages in a conversation as seen by the current reader
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, readerId } = body;

    if (!conversationId || !readerId) {
      return NextResponse.json(
        { error: "conversationId and readerId are required" },
        { status: 400 }
      );
    }

    const updatedCount = await markConversationAsSeen(conversationId, readerId);
    return NextResponse.json({ success: true, updatedCount });
  } catch (err: any) {
    console.error("[Chat Seen POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark messages as seen" },
      { status: 500 }
    );
  }
}
