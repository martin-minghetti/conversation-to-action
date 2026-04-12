import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import {
  normalizeSlackEvent,
  buildSlackReviewBlocks,
  parseSlackInteraction,
  verifySlackSignature,
} from "@/lib/connectors/slack";
import type { ResolvedItem } from "@/lib/connectors/types";
import fixtures from "../fixtures/slack_events.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeResolvedItem(overrides: Partial<ResolvedItem> = {}): ResolvedItem {
  return {
    type: "bug",
    title: "Login page broken on Safari",
    description: "Users cannot log in using Safari browser",
    owner: null,
    evidence: ["The login page is broken on Safari"],
    confidence: 0.9,
    suggestedLabels: ["bug", "browser"],
    dedup: {
      match: null,
      similarity: 0,
      action: "create",
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeSlackEvent
// ---------------------------------------------------------------------------
describe("normalizeSlackEvent", () => {
  it("normalizes a message event correctly", () => {
    const result = normalizeSlackEvent(
      fixtures.message_event,
      "workspace-1",
      "connection-1"
    );

    expect(result.source).toBe("slack");
    expect(result.workspaceId).toBe("workspace-1");
    expect(result.connectionId).toBe("connection-1");
    expect(result.channelId).toBe("C0123456789");
    expect(result.author).toBe("U0123456789");
    expect(result.text).toBe("The login page is broken on Safari");
    expect(result.threadId).toBe("1712927000.000001");
    expect(result.sourceMessageId).toBe("1712928000.000100");
  });

  it("sets threadId to null when not in a thread (no thread_ts)", () => {
    const eventWithoutThread = {
      ...fixtures.message_event,
      event: {
        ...fixtures.message_event.event,
        thread_ts: undefined,
      },
    };

    const result = normalizeSlackEvent(eventWithoutThread, "workspace-1", "connection-1");
    expect(result.threadId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildSlackReviewBlocks
// ---------------------------------------------------------------------------
describe("buildSlackReviewBlocks", () => {
  it("builds blocks with correct number of items (header + sections + action rows)", () => {
    const items: ResolvedItem[] = [makeResolvedItem(), makeResolvedItem({ type: "feature", title: "Dark mode" })];
    const blocks = buildSlackReviewBlocks(items);

    // 1 header + 2 sections + 2 action rows = 5
    expect(blocks).toHaveLength(5);
    expect(blocks[0].type).toBe("header");
    expect(blocks[1].type).toBe("section");
    expect(blocks[2].type).toBe("actions");
    expect(blocks[3].type).toBe("section");
    expect(blocks[4].type).toBe("actions");
  });

  it("includes dedup match info (ENG-274)", () => {
    const itemWithDedup = makeResolvedItem({
      dedup: {
        match: {
          externalId: "ENG-274",
          title: "Safari login issue",
          url: "https://linear.app/eng/issue/ENG-274",
          labels: ["bug"],
        },
        similarity: 0.87,
        action: "update",
      },
    });

    const blocks = buildSlackReviewBlocks([itemWithDedup]);
    const sectionBlock = blocks[1] as { type: string; text: { text: string } };

    expect(sectionBlock.text.text).toContain("ENG-274");
    expect(sectionBlock.text.text).toContain("Safari login issue");
  });

  it("includes action buttons per item (2 action blocks for 2 items)", () => {
    const items: ResolvedItem[] = [makeResolvedItem(), makeResolvedItem()];
    const blocks = buildSlackReviewBlocks(items);

    const actionBlocks = blocks.filter((b) => b.type === "actions");
    expect(actionBlocks).toHaveLength(2);

    // Each action block should have approve and discard buttons
    for (const actionBlock of actionBlocks) {
      const elements = (actionBlock as { type: string; elements: Array<{ action_id: string }> }).elements;
      expect(elements).toHaveLength(2);
      const actionIds = elements.map((e) => e.action_id);
      expect(actionIds.some((id) => id.startsWith("approve_"))).toBe(true);
      expect(actionIds.some((id) => id.startsWith("reject_"))).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// parseSlackInteraction
// ---------------------------------------------------------------------------
describe("parseSlackInteraction", () => {
  it("parses approve action (action='approve', itemIndex=0)", () => {
    const result = parseSlackInteraction(fixtures.block_action_approve);
    expect(result.action).toBe("approve");
    expect(result.itemIndex).toBe(0);
  });

  it("parses reject action (action='reject', itemIndex=1)", () => {
    const result = parseSlackInteraction(fixtures.block_action_reject);
    expect(result.action).toBe("reject");
    expect(result.itemIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// verifySlackSignature
// ---------------------------------------------------------------------------
describe("verifySlackSignature", () => {
  const signingSecret = "test-signing-secret";
  const body = '{"type":"event_callback"}';
  const timestamp = "1712928000";

  function buildSignature(secret: string, ts: string, rawBody: string): string {
    const baseString = `v0:${ts}:${rawBody}`;
    const hmac = createHmac("sha256", secret);
    hmac.update(baseString);
    return `v0=${hmac.digest("hex")}`;
  }

  it("returns true for a valid HMAC-SHA256 signature", () => {
    const signature = buildSignature(signingSecret, timestamp, body);
    expect(verifySlackSignature(body, timestamp, signature, signingSecret)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    expect(
      verifySlackSignature(body, timestamp, "v0=invalidsignature00000000000000000000000000000000000000000000000", signingSecret)
    ).toBe(false);
  });
});
