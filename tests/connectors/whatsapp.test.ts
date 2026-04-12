import { describe, it, expect } from "vitest";
import {
  extractWhatsAppMessages,
  normalizeWhatsAppEvent,
  buildWhatsAppReviewText,
  parseWhatsAppReply,
} from "@/lib/connectors/whatsapp";
import type { ResolvedItem } from "@/lib/connectors/types";
import fixtures from "../fixtures/whatsapp_events.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResolvedItem(overrides: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    type: "bug",
    title: "Checkout flow broken",
    description: "Customers can't complete payment",
    owner: null,
    evidence: ["The checkout flow is broken"],
    confidence: 0.88,
    suggestedLabels: ["bug", "payments"],
    dedup: {
      match: null,
      similarity: 0,
      action: "create",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// extractWhatsAppMessages
// ---------------------------------------------------------------------------
describe("extractWhatsAppMessages", () => {
  it("extracts messages from webhook payload", () => {
    const messages = extractWhatsAppMessages(fixtures.text_message);

    expect(messages).toHaveLength(1);
    expect(messages[0].id).toBe("wamid.abc123");
    expect(messages[0].from).toBe("5491112345678");
    expect(messages[0].text?.body).toBe(
      "The checkout flow is broken, customers can't complete payment"
    );
  });

  it("returns empty array for payload with no messages", () => {
    const messages = extractWhatsAppMessages({ entry: [] });
    expect(messages).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeWhatsAppEvent
// ---------------------------------------------------------------------------
describe("normalizeWhatsAppEvent", () => {
  it("normalizes a text message correctly", () => {
    const messages = extractWhatsAppMessages(fixtures.text_message);
    const result = normalizeWhatsAppEvent(messages[0], "workspace-1", "connection-1");

    expect(result.source).toBe("whatsapp");
    expect(result.author).toBe("5491112345678");
    expect(result.text).toBe(
      "The checkout flow is broken, customers can't complete payment"
    );
    expect(result.channelId).toBe("5491112345678");
    expect(result.threadId).toBeNull();
    expect(result.workspaceId).toBe("workspace-1");
    expect(result.connectionId).toBe("connection-1");
  });
});

// ---------------------------------------------------------------------------
// buildWhatsAppReviewText
// ---------------------------------------------------------------------------
describe("buildWhatsAppReviewText", () => {
  it("formats items with numbered actions", () => {
    const item = makeResolvedItem();
    const text = buildWhatsAppReviewText([item]);

    expect(text).toContain("1 item");
    expect(text).toContain("BUG");
    expect(text).toContain("Checkout flow broken");
    expect(text).toContain("88%");
    expect(text).toContain("Reply 1A to approve");
    expect(text).toContain("Reply 1D to discard");
  });
});

// ---------------------------------------------------------------------------
// parseWhatsAppReply
// ---------------------------------------------------------------------------
describe("parseWhatsAppReply", () => {
  it("parses '1A' as approve itemIndex 0", () => {
    const result = parseWhatsAppReply("1A");
    expect(result.action).toBe("approve");
    expect(result.itemIndex).toBe(0);
  });

  it("parses '2D' as reject itemIndex 1", () => {
    const result = parseWhatsAppReply("2D");
    expect(result.action).toBe("reject");
    expect(result.itemIndex).toBe(1);
  });

  it("is case-insensitive ('1a' works)", () => {
    const result = parseWhatsAppReply("1a");
    expect(result.action).toBe("approve");
    expect(result.itemIndex).toBe(0);
  });
});
