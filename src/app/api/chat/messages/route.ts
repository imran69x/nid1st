import { NextRequest, NextResponse } from "next/server";
import { getMessagesForConversation, sendChatMessage } from "@/lib/server/store";

export const dynamic = "force-dynamic";

// GET: Fetch all messages for a conversation (Privacy protected)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");
    const username = searchParams.get("username") || undefined;

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: "conversationId and userId are required" },
        { status: 400 }
      );
    }

    const messages = await getMessagesForConversation(conversationId, userId, username);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Access denied");
    return NextResponse.json(
      { error: err.message || "Failed to load messages" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}

// POST: Send a new message
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { conversationId, senderId, text, messageType } = body;

    if (!conversationId || !senderId || !text || !String(text).trim()) {
      return NextResponse.json(
        { error: "conversationId, senderId, and non-empty text are required" },
        { status: 400 }
      );
    }

    const validMessageType = messageType === "sticker" ? "sticker" : "text";
    const message = await sendChatMessage(
      conversationId,
      senderId,
      String(text).trim(),
      validMessageType
    );
    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Access denied");
    return NextResponse.json(
      { error: err.message || "Failed to send message" },
      { status: isForbidden ? 403 : 500 }
    );
  }
}
