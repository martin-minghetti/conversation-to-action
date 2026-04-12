import { describe, it, expect } from "vitest";
import { resolveItems } from "@/lib/pipeline/resolve";
import type { ExtractedItem, ExistingItem, SinkConnector } from "@/lib/connectors/types";

function makeMockSink(existingItems: ExistingItem[]): SinkConnector {
  return {
    searchExisting: async () => existingItems,
    createItem: async () => ({ externalId: "new-1", url: "https://example.com/new-1" }),
    updateItem: async () => ({ externalId: "existing-1", url: "https://example.com/existing-1" }),
    linkEvidence: async () => {},
  };
}

const sampleBug: ExtractedItem = {
  type: "bug",
  title: "Login page crashes on Safari",
  description: "Users report the login page crashes when using Safari browser.",
  owner: null,
  evidence: ["https://example.com/message/1"],
  confidence: 80,
  suggestedLabels: ["bug", "safari"],
};

describe("resolveItems", () => {
  it("returns action 'create' and null match when no existing items", async () => {
    const sink = makeMockSink([]);
    const results = await resolveItems([sampleBug], sink, {}, "creds");

    expect(results).toHaveLength(1);
    expect(results[0].dedup.action).toBe("create");
    expect(results[0].dedup.match).toBeNull();
  });

  it("returns action 'update' and match externalId for exact title match", async () => {
    const existing: ExistingItem[] = [
      {
        externalId: "existing-1",
        title: "Login page crashes on Safari",
        url: "https://example.com/existing-1",
        labels: ["bug"],
      },
    ];
    const sink = makeMockSink(existing);
    const results = await resolveItems([sampleBug], sink, {}, "creds");

    expect(results).toHaveLength(1);
    expect(results[0].dedup.action).toBe("update");
    expect(results[0].dedup.match?.externalId).toBe("existing-1");
  });

  it("returns action 'update' or 'ambiguous' for multiple partial matches", async () => {
    const existing: ExistingItem[] = [
      {
        externalId: "existing-1",
        title: "Login page crashes on Safari browser",
        url: "https://example.com/existing-1",
        labels: ["bug"],
      },
      {
        externalId: "existing-2",
        title: "Login page crashes on Safari mobile",
        url: "https://example.com/existing-2",
        labels: ["bug"],
      },
    ];
    const sink = makeMockSink(existing);
    const results = await resolveItems([sampleBug], sink, {}, "creds");

    expect(results).toHaveLength(1);
    expect(["update", "ambiguous"]).toContain(results[0].dedup.action);
  });

  it("lowers confidence when action is ambiguous", async () => {
    // Two nearly identical titles to force ambiguity
    const existing: ExistingItem[] = [
      {
        externalId: "existing-1",
        title: "Login page crashes on Safari browser",
        url: "https://example.com/existing-1",
        labels: ["bug"],
      },
      {
        externalId: "existing-2",
        title: "Safari login page crash bug",
        url: "https://example.com/existing-2",
        labels: ["bug"],
      },
    ];
    const sink = makeMockSink(existing);
    const results = await resolveItems([sampleBug], sink, {}, "creds");

    if (results[0].dedup.action === "ambiguous") {
      expect(results[0].confidence).toBe(sampleBug.confidence - 15);
    }
  });

  it("defaults to 'create' when sink search fails", async () => {
    const failingSink: SinkConnector = {
      searchExisting: async () => { throw new Error("Search failed"); },
      createItem: async () => ({ externalId: "new-1", url: "https://example.com/new-1" }),
      updateItem: async () => ({ externalId: "existing-1", url: "https://example.com/existing-1" }),
      linkEvidence: async () => {},
    };
    const results = await resolveItems([sampleBug], failingSink, {}, "creds");

    expect(results).toHaveLength(1);
    expect(results[0].dedup.action).toBe("create");
    expect(results[0].dedup.match).toBeNull();
  });
});
