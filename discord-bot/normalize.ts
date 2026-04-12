import type { CanonicalEvent } from "../src/lib/connectors/types.js";

interface DiscordMessage {
  id: string;
  channel_id: string;
  author: {
    id: string;
    username: string;
    bot?: boolean;
  };
  content: string;
  timestamp: string;
  message_reference?: {
    message_id?: string;
  };
}

export function normalizeMessage(
  msg: DiscordMessage,
  workspaceId: string,
  connectionId: string
): CanonicalEvent | null {
  // Skip bot messages
  if (msg.author.bot) {
    return null;
  }

  // Skip empty content
  if (!msg.content || msg.content.trim() === "") {
    return null;
  }

  return {
    source: "discord",
    workspaceId,
    connectionId,
    sourceMessageId: msg.id,
    channelId: msg.channel_id,
    threadId: msg.message_reference?.message_id ?? null,
    author: msg.author.username,
    text: msg.content,
    permalink: null,
    timestamp: new Date(msg.timestamp),
  };
}
