import { ChatConversation, ChatMessage, ChatParticipant } from "@/types/chat";

/**
 * Fetch all conversations for the active user
 */
export async function fetchUserConversations(
  userId: string,
  username?: string
): Promise<ChatConversation[]> {
  const url = new URL("/api/chat/conversations", window.location.origin);
  url.searchParams.set("userId", userId);
  if (username) url.searchParams.set("username", username);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch conversations");
  }
  return data.conversations || [];
}

/**
 * Search user by phone number or ID
 */
export async function searchUserByNumber(
  query: string,
  currentUserId: string
): Promise<{ id: string; username: string; name: string; profilePic?: string; isSelf: boolean } | null> {
  const url = new URL("/api/chat/users/search", window.location.origin);
  url.searchParams.set("query", query);
  url.searchParams.set("currentUserId", currentUserId);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to search user");
  }
  return data.user || null;
}

/**
 * Start or open a conversation with a user by their phone number / username
 */
export async function startConversationWithNumber(
  currentUserId: string,
  targetNumber: string
): Promise<ChatConversation> {
  const res = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentUserId, targetNumber }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to start conversation");
  }
  return data.conversation;
}

/**
 * Fetch messages for a conversation
 */
export async function fetchConversationMessages(
  conversationId: string,
  userId: string,
  username?: string
): Promise<ChatMessage[]> {
  const url = new URL("/api/chat/messages", window.location.origin);
  url.searchParams.set("conversationId", conversationId);
  url.searchParams.set("userId", userId);
  if (username) url.searchParams.set("username", username);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch messages");
  }
  return data.messages || [];
}

/**
 * Send a message to a conversation
 */
export async function sendChatMessage(
  conversationId: string,
  senderId: string,
  text: string,
  messageType: "text" | "sticker" = "text"
): Promise<ChatMessage> {
  const res = await fetch("/api/chat/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, senderId, text, messageType }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to send message");
  }
  return data.message;
}

/**
 * Mark messages in a conversation as seen
 */
export async function markChatAsSeen(
  conversationId: string,
  readerId: string
): Promise<number> {
  const res = await fetch("/api/chat/seen", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conversationId, readerId }),
  });
  const data = await res.json();
  return data.updatedCount || 0;
}

/**
 * Get total unread count for user badge
 */
export async function fetchTotalUnreadCount(
  userId: string,
  username?: string
): Promise<number> {
  const url = new URL("/api/chat/unread", window.location.origin);
  url.searchParams.set("userId", userId);
  if (username) url.searchParams.set("username", username);

  const res = await fetch(url.toString(), { cache: "no-store" });
  const data = await res.json();
  return data.unreadCount || 0;
}
