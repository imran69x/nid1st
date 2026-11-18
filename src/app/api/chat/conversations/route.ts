import { NextRequest, NextResponse } from "next/server";
import {
  getConversationsForUser,
  createOrGetConversation,
  findUserById,
  findUserByNumberOrId,
} from "@/lib/server/store";

export const dynamic = "force-dynamic";

// GET: Fetch all private conversations for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const username = searchParams.get("username") || undefined;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const conversations = await getConversationsForUser(userId, username);
    return NextResponse.json({ success: true, conversations });
  } catch (err: any) {
    console.error("[Chat Conversations GET] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

// POST: Start or open conversation with another user by phone number / username
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentUserId, targetNumber } = body;

    if (!currentUserId || !targetNumber) {
      return NextResponse.json(
        { error: "currentUserId and targetNumber are required" },
        { status: 400 }
      );
    }

    const currentUser = await findUserById(currentUserId);
    if (!currentUser) {
      return NextResponse.json({ error: "Current user session not found" }, { status: 404 });
    }

    // Search target user by phone number or ID
    const targetUser = await findUserByNumberOrId(targetNumber);
    if (!targetUser) {
      return NextResponse.json(
        { error: "এই নম্বরে কোনো ইউজার পাওয়া যায়নি। নম্বরটি যাচাই করুন।" },
        { status: 404 }
      );
    }

    // Prevent chatting with oneself
    if (targetUser.id === currentUser.id || targetUser.username.toLowerCase() === currentUser.username.toLowerCase()) {
      return NextResponse.json(
        { error: "আপনি নিজের সাথে চ্যাট শুরু করতে পারবেন না।" },
        { status: 400 }
      );
    }

    // Create or retrieve conversation
    const conversation = await createOrGetConversation(currentUser, targetUser);
    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    console.error("[Chat Conversations POST] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to start conversation" },
      { status: 500 }
    );
  }
}
