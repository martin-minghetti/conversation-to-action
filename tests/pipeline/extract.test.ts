import { describe, it, expect, vi } from "vitest";
import { buildExtractionPrompt, extractItems } from "@/lib/pipeline/extract";
import sampleThreads from "../fixtures/sample_threads.json";
import claudeExtractions from "../fixtures/claude_extractions.json";

// Helper: build a mock client that returns a given extraction JSON
function makeMockClient(responseJson: unknown) {
  return {
    messagesCreate: vi.fn().mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(responseJson) }],
    }),
  };
}

// ─── buildExtractionPrompt ───────────────────────────────────────────────────

describe("buildExtractionPrompt", () => {
  it("formats messages with [author] and text", () => {
    const messages = sampleThreads.bug_thread.messages;
    const prompt = buildExtractionPrompt(messages);

    expect(prompt).toContain("[sarah]");
    expect(prompt).toContain("[mike]");
    expect(prompt).toContain("login is crashing on Safari");
    expect(prompt).toContain("OAuth redirect is broken");
  });

  it("truncates to last 20 messages for long threads", () => {
    // Build a thread with 25 messages
    const messages = Array.from({ length: 25 }, (_, i) => ({
      author: `user${i}`,
      text: `Message number ${i}`,
      timestamp: new Date(Date.now() + i * 60000).toISOString(),
    }));

    const prompt = buildExtractionPrompt(messages);

    // First 5 messages should NOT appear
    expect(prompt).not.toContain("Message number 0");
    expect(prompt).not.toContain("Message number 4");

    // Last 20 messages SHOULD appear
    expect(prompt).toContain("Message number 5");
    expect(prompt).toContain("Message number 24");
  });
});

// ─── extractItems ────────────────────────────────────────────────────────────

describe("extractItems", () => {
  it("extracts a bug from a bug thread", async () => {
    const client = makeMockClient(claudeExtractions.bug_extraction);
    const messages = sampleThreads.bug_thread.messages;

    const result = await extractItems(messages, "test-api-key", client);

    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("bug");
    expect(result.items[0].owner).toBe("mike");
    expect(result.items[0].confidence).toBe(95);
    expect(result.threadSummary).toContain("Safari");
  });

  it("extracts feature and decision from a mixed thread", async () => {
    const client = makeMockClient(
      claudeExtractions.feature_and_decision_extraction
    );
    const messages = sampleThreads.feature_and_decision_thread.messages;

    const result = await extractItems(messages, "test-api-key", client);

    expect(result.items).toHaveLength(2);

    const decision = result.items.find((i) => i.type === "decision");
    const feature = result.items.find((i) => i.type === "feature");

    expect(decision).toBeDefined();
    expect(decision?.title.toLowerCase()).toContain("dark mode");

    expect(feature).toBeDefined();
    expect(feature?.owner).toBe("dev_bob");
  });

  it("returns empty items for small talk thread", async () => {
    const client = makeMockClient(claudeExtractions.empty_extraction);
    const messages = sampleThreads.small_talk_thread.messages;

    const result = await extractItems(messages, "test-api-key", client);

    expect(result.items).toHaveLength(0);
    expect(result.threadSummary).toContain("no actionable items");
  });

  it("retries once on malformed Claude response and succeeds on second call", async () => {
    const client = {
      messagesCreate: vi
        .fn()
        .mockResolvedValueOnce({
          content: [{ type: "text", text: "this is not valid json {{{" }],
        })
        .mockResolvedValueOnce({
          content: [
            {
              type: "text",
              text: JSON.stringify(claudeExtractions.bug_extraction),
            },
          ],
        }),
    };

    const messages = sampleThreads.bug_thread.messages;
    const result = await extractItems(messages, "test-api-key", client);

    expect(client.messagesCreate).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].type).toBe("bug");
  });

  it("returns fallback result after exhausting retries on persistent malformed response", async () => {
    const client = {
      messagesCreate: vi.fn().mockResolvedValue({
        content: [{ type: "text", text: "totally invalid json" }],
      }),
    };

    const messages = sampleThreads.bug_thread.messages;
    const result = await extractItems(messages, "test-api-key", client);

    // MAX_RETRIES = 1, so 2 total calls (initial + 1 retry)
    expect(client.messagesCreate).toHaveBeenCalledTimes(2);
    expect(result.items).toHaveLength(0);
    expect(result.threadSummary).toBe("Extraction failed");
  });
});
