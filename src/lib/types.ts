export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_hue: number;
  is_guest: boolean;
  is_bot: boolean;
};

export type InboxRow = {
  id: string;
  kind: "channel" | "dm";
  name: string;
  topic: string | null;
  peer_id: string | null;
  last_message_at: string;
  last_body: string | null;
  last_author: string | null;
  unread: number;
};

export type Message = {
  id: number;
  conversation_id: string;
  author_id: string;
  body: string;
  attachment_path: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  // client-only: optimistic sends
  pending?: boolean;
  failed?: string;
  tempId?: string;
};

export type Reaction = {
  message_id: number;
  user_id: string;
  emoji: string;
};

export const EMOJIS = ["👍", "❤️", "😂", "🎉", "👀", "🔥"] as const;
