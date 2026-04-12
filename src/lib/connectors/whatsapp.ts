import type {
  CanonicalEvent,
  ResolvedItem,
  InteractionResult,
  SourceConnector,
} from "@/lib/connectors/types";

// ---------------------------------------------------------------------------
// WhatsApp message shape (minimal)
// ---------------------------------------------------------------------------
export interface WhatsAppMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

// ---------------------------------------------------------------------------
// extractWhatsAppMessages
// ---------------------------------------------------------------------------
export function extractWhatsAppMessages(payload: unknown): WhatsAppMessage[] {
  const p = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          messages?: WhatsAppMessage[];
        };
      }>;
    }>;
  };

  const messages: WhatsAppMessage[] = [];

  for (const entry of p.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type === "text") {
          messages.push(msg);
        }
      }
    }
  }

  return messages;
}

// ---------------------------------------------------------------------------
// normalizeWhatsAppEvent
// ---------------------------------------------------------------------------
export function normalizeWhatsAppEvent(
  msg: WhatsAppMessage,
  workspaceId: string,
  connectionId: string
): CanonicalEvent {
  return {
    source: "whatsapp",
    workspaceId,
    connectionId,
    sourceMessageId: msg.id,
    channelId: msg.from,
    threadId: null,
    author: msg.from,
    text: msg.text?.body ?? "",
    permalink: null,
    timestamp: new Date(parseInt(msg.timestamp, 10) * 1000),
  };
}

// ---------------------------------------------------------------------------
// buildWhatsAppReviewText
// ---------------------------------------------------------------------------
export function buildWhatsAppReviewText(items: ResolvedItem[]): string {
  const lines: string[] = [
    `*${items.length} item${items.length === 1 ? "" : "s"} pending review*`,
    "",
  ];

  items.forEach((item, index) => {
    const n = index + 1;
    const confidence = Math.round(item.confidence * 100);
    const typeLabel = item.type.toUpperCase();

    lines.push(`${n}. [${typeLabel}] ${item.title}`);
    lines.push(`   Confidence: ${confidence}%`);

    if (item.dedup.match) {
      lines.push(
        `   Dedup: ${item.dedup.match.externalId} — ${item.dedup.match.title} (${Math.round(item.dedup.similarity * 100)}% similar, action: ${item.dedup.action})`
      );
    }

    lines.push(`   Reply ${n}A to approve | Reply ${n}D to discard`);
    lines.push("");
  });

  return lines.join("\n").trimEnd();
}

// ---------------------------------------------------------------------------
// parseWhatsAppReply
// ---------------------------------------------------------------------------
export function parseWhatsAppReply(text: string): InteractionResult {
  const match = text.trim().match(/^(\d+)([aAdD])$/);

  if (!match) {
    throw new Error(`Cannot parse WhatsApp reply: "${text}"`);
  }

  const itemIndex = parseInt(match[1], 10) - 1;
  const letter = match[2].toLowerCase();
  const action: "approve" | "reject" = letter === "a" ? "approve" : "reject";

  return { itemIndex, action };
}

// ---------------------------------------------------------------------------
// sendWhatsAppReview
// ---------------------------------------------------------------------------
export async function sendWhatsAppReview(
  accessToken: string,
  phoneNumberId: string,
  recipientPhone: string,
  items: ResolvedItem[]
): Promise<string> {
  const text = buildWhatsAppReviewText(items);

  const body = {
    messaging_product: "whatsapp",
    to: recipientPhone,
    type: "text",
    text: { body: text },
  };

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await response.json()) as {
    messages?: Array<{ id: string }>;
    error?: { message: string };
  };

  if (!response.ok || data.error) {
    throw new Error(`WhatsApp API error: ${data.error?.message ?? "unknown"}`);
  }

  return data.messages?.[0]?.id ?? "";
}

// ---------------------------------------------------------------------------
// whatsappConnector — SourceConnector implementation
// ---------------------------------------------------------------------------
export const whatsappConnector: SourceConnector = {
  normalizeEvent(raw: unknown): CanonicalEvent {
    const msgs = extractWhatsAppMessages(raw);
    if (msgs.length === 0) {
      throw new Error("No text messages found in WhatsApp payload");
    }
    return normalizeWhatsAppEvent(msgs[0], "", "");
  },

  async sendReview(
    credentials: string,
    channelId: string,
    _threadId: string | null,
    items: ResolvedItem[]
  ): Promise<string> {
    // credentials format: "accessToken:phoneNumberId"
    const [accessToken, phoneNumberId] = credentials.split(":");
    return sendWhatsAppReview(accessToken, phoneNumberId, channelId, items);
  },

  parseInteraction(raw: unknown): InteractionResult {
    const payload = raw as { body?: string } | string;
    const text = typeof payload === "string" ? payload : (payload as { body: string }).body;
    return parseWhatsAppReply(text);
  },
};
