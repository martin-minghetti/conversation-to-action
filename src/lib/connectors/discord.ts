import type {
  CanonicalEvent,
  ResolvedItem,
  InteractionResult,
  SourceConnector,
} from "@/lib/connectors/types";

// ---------------------------------------------------------------------------
// Type emoji map
// ---------------------------------------------------------------------------
const TYPE_EMOJI: Record<string, string> = {
  bug: "🐛",
  feature: "🆕",
  task: "☑️",
  decision: "🧠",
};

// ---------------------------------------------------------------------------
// normalizeDiscordEvent
// ---------------------------------------------------------------------------
export function normalizeDiscordEvent(
  msg: unknown,
  workspaceId: string,
  connectionId: string
): CanonicalEvent {
  const m = msg as {
    id: string;
    channel_id: string;
    author: { id: string; username: string };
    content: string;
    timestamp: string;
    message_reference?: { message_id?: string };
  };

  return {
    source: "discord",
    workspaceId,
    connectionId,
    sourceMessageId: m.id,
    channelId: m.channel_id,
    threadId: m.message_reference?.message_id ?? null,
    author: m.author.username,
    text: m.content,
    permalink: null,
    timestamp: new Date(m.timestamp),
  };
}

// ---------------------------------------------------------------------------
// buildDiscordReviewContent
// ---------------------------------------------------------------------------
export function buildDiscordReviewContent(items: ResolvedItem[]): {
  content: string;
  components: object[];
} {
  const lines: string[] = ["**Items pending review**", ""];
  const components: object[] = [];

  items.forEach((item, index) => {
    const emoji = TYPE_EMOJI[item.type] ?? "📝";
    const confidence = Math.round(item.confidence * 100);

    lines.push(`${emoji} **${item.title}**`);
    lines.push(`Type: ${item.type} | Confidence: ${confidence}%`);

    if (item.dedup.match) {
      const similarity = Math.round(item.dedup.similarity * 100);
      lines.push(
        `Dedup match: [${item.dedup.match.externalId}](${item.dedup.match.url}) — ${item.dedup.match.title} (${similarity}% similar, action: ${item.dedup.action})`
      );
    }

    lines.push("");

    // Action row per item
    components.push({
      type: 1, // ACTION_ROW
      components: [
        {
          type: 2, // BUTTON
          style: 3, // SUCCESS (green)
          label: "Approve",
          custom_id: `approve_${index}`,
        },
        {
          type: 2, // BUTTON
          style: 4, // DANGER (red)
          label: "Discard",
          custom_id: `reject_${index}`,
        },
      ],
    });
  });

  return {
    content: lines.join("\n").trimEnd(),
    components,
  };
}

// ---------------------------------------------------------------------------
// parseDiscordInteraction
// ---------------------------------------------------------------------------
export function parseDiscordInteraction(payload: unknown): InteractionResult {
  const p = payload as {
    type: number;
    data: { custom_id: string };
    message: { id: string };
  };

  const customId = p.data.custom_id; // e.g. "approve_0" or "reject_1"
  const underscoreIndex = customId.lastIndexOf("_");
  const actionType = customId.slice(0, underscoreIndex) as "approve" | "reject" | "edit";
  const itemIndex = parseInt(customId.slice(underscoreIndex + 1), 10);

  return {
    action: actionType,
    itemIndex,
  };
}

// ---------------------------------------------------------------------------
// sendDiscordReview
// ---------------------------------------------------------------------------
async function sendDiscordReview(
  botToken: string,
  channelId: string,
  _threadId: string | null,
  items: ResolvedItem[]
): Promise<string> {
  const { content, components } = buildDiscordReviewContent(items);

  const response = await fetch(
    `https://discord.com/api/v10/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bot ${botToken}`,
      },
      body: JSON.stringify({ content, components }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API error: ${error}`);
  }

  const data = (await response.json()) as { id: string };
  return data.id;
}

// ---------------------------------------------------------------------------
// discordConnector — SourceConnector implementation
// ---------------------------------------------------------------------------
export const discordConnector: SourceConnector = {
  normalizeEvent(raw: unknown): CanonicalEvent {
    return normalizeDiscordEvent(raw, "", "");
  },

  async sendReview(
    credentials: string,
    channelId: string,
    threadId: string | null,
    items: ResolvedItem[]
  ): Promise<string> {
    return sendDiscordReview(credentials, channelId, threadId, items);
  },

  parseInteraction(raw: unknown): InteractionResult {
    return parseDiscordInteraction(raw);
  },
};
