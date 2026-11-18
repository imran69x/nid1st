export interface ChatParticipant {
  id: string;
  username: string; // Phone number or login ID
  name: string;     // Display Name
  profilePic?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  recipientId: string;
  text: string;
  messageType?: "text" | "sticker";
  createdAt: number;
  seen: boolean;
  seenAt?: number | null;
}

export interface ChatConversation {
  id: string;
  participants: string[]; // [userId1, userId2]
  participantUsernames: string[]; // [phone1, phone2]
  participantDetails: Record<string, ChatParticipant>;
  lastMessage?: {
    text: string;
    senderId: string;
    createdAt: number;
    seen: boolean;
  } | null;
  createdAt: number;
  updatedAt: number;
  unreadCount?: number;
}
