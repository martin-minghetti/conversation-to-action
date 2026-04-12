import { createHmac, timingSafeEqual } from "crypto";
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
// normalizeSlackEvent
// ---------------------------------------------------------------------------
export function normalizeSlackEvent(
  raw: unknown,
  workspaceId: string,
  connectionId: string
): CanonicalEvent {
  const payload = raw as {
    event: {
      type: string;
      channel: string;
      user: string;
      text: string;
      ts: string;
      thread_ts?: string;
    };
    team_id: string;
  };

  const event = payload.event;

  return {
    source: "slack",
    workspaceId,
    connectionId,
    sourceMessageId: event.ts,
    channelId: event.channel,
    threadId: event.thread_ts ?? null,
    author: event.user,
    text: event.text,
    permalink: null,
    timestamp: new Date(parseFloat(event.ts) * 1000),
  };
}

// ---------------------------------------------------------------------------
// Block Kit types (minimal)
// ---------------------------------------------------------------------------
interface Block {
  type: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// buildSlackReviewBlocks
// ---------------------------------------------------------------------------
export function buildSlackReviewBlocks(items: ResolvedItem[]): Block[] {
  const blocks: Block[] = [];

  // Header
  blocks.push({
    type: "header",
    text: {
      type: "plain_text",
      text: "Items pending review",
      emoji: true,
    },
  });

  items.forEach((item, index) => {
    const emoji = TYPE_EMOJI[item.type] ?? "📝";
    const confidence = Math.round(item.confidence * 100);

    // Section with item details
    let dedupInfo = "";
    if (item.dedup.match) {
      dedupInfo = `\n*Dedup match:* <${item.dedup.match.url}|${item.dedup.match.externalId}> — ${item.dedup.match.title} (${Math.round(item.dedup.similarity * 100)}% similar, action: ${item.dedup.action})`;
    }

    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${emoji} *${item.title}*\nType: ${item.type} | Confidence: ${confidence}%${dedupInfo}`,
      },
    });

    // Action row with approve / discard buttons
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Approve",
            emoji: true,
          },
          style: "primary",
          action_id: `approve_${index}`,
          value: String(index),
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Discard",
            emoji: true,
          },
          style: "danger",
          action_id: `reject_${index}`,
          value: String(index),
        },
      ],
    });
  });

  return blocks;
}

// ---------------------------------------------------------------------------
// sendSlackReview
// ---------------------------------------------------------------------------
export async function sendSlackReview(
  botToken: string,
  channelId: string,
  threadId: string | null,
  items: ResolvedItem[]
): Promise<string> {
  const blocks = buildSlackReviewBlocks(items);

  const body: Record<string, unknown> = {
    channel: channelId,
    blocks,
    text: "Items pending review",
  };

  if (threadId) {
    body.thread_ts = threadId;
  }

  const response = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json()) as { ok: boolean; ts?: string; error?: string };

  if (!data.ok) {
    throw new Error(`Slack API error: ${data.error ?? "unknown"}`);
  }

  return data.ts!;
}

// ---------------------------------------------------------------------------
// parseSlackInteraction
// ---------------------------------------------------------------------------
export function parseSlackInteraction(payload: unknown): InteractionResult {
  const p = payload as {
    type: string;
    actions: Array<{ action_id: string; value: string }>;
  };

  const action = p.actions[0];
  const actionId = action.action_id; // e.g. "approve_0" or "reject_1"

  const underscoreIndex = actionId.lastIndexOf("_");
  const actionType = actionId.slice(0, underscoreIndex) as "approve" | "reject" | "edit";
  const itemIndex = parseInt(actionId.slice(underscoreIndex + 1), 10);

  return {
    action: actionType,
    itemIndex,
  };
}

// ---------------------------------------------------------------------------
// verifySlackSignature
// ---------------------------------------------------------------------------
export function verifySlackSignature(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  const baseString = `v0:${timestamp}:${body}`;
  const hmac = createHmac("sha256", signingSecret);
  hmac.update(baseString);
  const computed = `v0=${hmac.digest("hex")}`;

  try {
    return timingSafeEqual(Buffer.from(computed, "utf8"), Buffer.from(signature, "utf8"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// slackConnector — SourceConnector implementation
// ---------------------------------------------------------------------------
export const slackConnector: SourceConnector = {
  normalizeEvent(raw: unknown): CanonicalEvent {
    // workspaceId and connectionId are extracted from the payload when available
    const payload = raw as {
      team_id?: string;
      event?: { channel?: string };
    };
    return normalizeSlackEvent(raw, payload.team_id ?? "", "");
  },

  async sendReview(
    credentials: string,
    channelId: string,
    threadId: string | null,
    items: ResolvedItem[]
  ): Promise<string> {
    return sendSlackReview(credentials, channelId, threadId, items);
  },

  parseInteraction(raw: unknown): InteractionResult {
    return parseSlackInteraction(raw);
  },
};
