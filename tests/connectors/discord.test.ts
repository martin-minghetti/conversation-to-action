import { describe, it, expect } from "vitest";
import {
  normalizeDiscordEvent,
  buildDiscordReviewContent,
  parseDiscordInteraction,
} from "@/lib/connectors/discord";
import type { ResolvedItem } from "@/lib/connectors/types";
import fixtures from "../fixtures/discord_events.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResolvedItem(overrides: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    type: "bug",
    title: "API returning 500 errors",
    description: "The /users endpoint returns 500 errors intermittently",
    owner: null,
    evidence: ["The API is returning 500 errors on the /users endpoint"],
    confidence: 0.9,
    suggestedLabels: ["bug", "api"],
    dedup: {
      match: null,
      similarity: 0,
      action: "create",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeDiscordEvent
// ---------------------------------------------------------------------------
describe("normalizeDiscordEvent", () => {
  it("normalizes message with thread reference", () => {
    const result = normalizeDiscordEvent(
      fixtures.message_create,
      "workspace-1",
      "connection-1"
    );

    expect(result.source).toBe("discord");
    expect(result.workspaceId).toBe("workspace-1");
    expect(result.connectionId).toBe("connection-1");
    expect(result.channelId).toBe("9876543210987654321");
    expect(result.author).toBe("sarah_dev");
    expect(result.threadId).toBe("1234567890123456780");
    expect(result.sourceMessageId).toBe("1234567890123456789");
    expect(result.text).toBe("The API is returning 500 errors on the /users endpoint");
  });

  it("sets threadId to null when not a reply", () => {
    const result = normalizeDiscordEvent(
      fixtures.message_no_thread,
      "workspace-1",
      "connection-1"
    );

    expect(result.threadId).toBeNull();
    expect(result.author).toBe("mike_eng");
  });
});

// ---------------------------------------------------------------------------
// buildDiscordReviewContent
// ---------------------------------------------------------------------------
describe("buildDiscordReviewContent", () => {
  it("builds message content with item details (BUG, title, 90%)", () => {
    const item = makeResolvedItem({ type: "bug", title: "API returning 500 errors", confidence: 0.9 });
    const { content } = buildDiscordReviewContent([item]);

    expect(content).toContain("🐛");
    expect(content).toContain("API returning 500 errors");
    expect(content).toContain("90%");
    expect(content).toContain("bug");
  });

  it("returns components with ActionRow", () => {
    const item = makeResolvedItem();
    const { components } = buildDiscordReviewContent([item]);

    expect(components).toHaveLength(1);
    const row = components[0] as { type: number; components: Array<{ custom_id: string }> };
    expect(row.type).toBe(1); // ACTION_ROW
    expect(row.components).toHaveLength(2);
    const ids = row.components.map((c) => c.custom_id);
    expect(ids).toContain("approve_0");
    expect(ids).toContain("reject_0");
  });

  it("includes dedup match info when present", () => {
    const item = makeResolvedItem({
      dedup: {
        match: {
          externalId: "ENG-99",
          title: "API 500 known issue",
          url: "https://linear.app/eng/issue/ENG-99",
          labels: ["bug"],
        },
        similarity: 0.85,
        action: "update",
      },
    });

    const { content } = buildDiscordReviewContent([item]);
    expect(content).toContain("ENG-99");
    expect(content).toContain("API 500 known issue");
  });
});

// ---------------------------------------------------------------------------
// parseDiscordInteraction
// ---------------------------------------------------------------------------
describe("parseDiscordInteraction", () => {
  it("parses approve interaction (action='approve', itemIndex=0)", () => {
    const result = parseDiscordInteraction(fixtures.component_interaction_approve);

    expect(result.action).toBe("approve");
    expect(result.itemIndex).toBe(0);
  });
});
