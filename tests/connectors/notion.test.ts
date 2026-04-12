import { describe, it, expect, vi, beforeEach } from "vitest";
import { notionConnector } from "@/lib/connectors/notion";
import type { ApprovedItem } from "@/lib/connectors/types";
import fixtures from "../fixtures/notion_responses.json";

// ---------------------------------------------------------------------------
// Config & credentials
// ---------------------------------------------------------------------------
const testConfig = { databaseId: "db-123" };
const testCreds = "ntn_test_key";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeApprovedItem(overrides: Partial<ApprovedItem> = {}): ApprovedItem {
  return {
    type: "bug",
    title: "Login page crashes on Safari",
    description: "Users cannot log in using Safari browser",
    owner: null,
    suggestedLabels: ["bug", "auth"],
    evidence: ["The login button throws a JS error on Safari 16"],
    dedupAction: "create",
    dedupMatchId: null,
    ...overrides,
  };
}

function mockJsonResponse(body: unknown): Response {
  return {
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// searchExisting
// ---------------------------------------------------------------------------
describe("notionConnector.searchExisting", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns matching pages mapped to ExistingItem[]", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.search_with_match));

    const results = await notionConnector.searchExisting(
      testCreds,
      "login page crashes safari",
      testConfig
    );

    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe("page-abc-123");
    expect(results[0].title).toBe("Login page crashes on Safari");
    expect(results[0].url).toBe("https://notion.so/page-abc-123");
  });

  it("returns empty array when no matches found", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.search_no_match));

    const results = await notionConnector.searchExisting(
      testCreds,
      "some query with no results",
      testConfig
    );

    expect(results).toHaveLength(0);
    expect(Array.isArray(results)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// createItem
// ---------------------------------------------------------------------------
describe("notionConnector.createItem", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("creates page and returns external ID", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.create_response));

    const result = await notionConnector.createItem(
      testCreds,
      makeApprovedItem(),
      testConfig
    );

    expect(result.externalId).toBe("page-def-456");
    expect(result.url).toBe("https://notion.so/page-def-456");
  });

  it("sends request body with correct parent.database_id and properties.Name.title", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.create_response));

    await notionConnector.createItem(testCreds, makeApprovedItem(), testConfig);

    expect(mockFetch).toHaveBeenCalledOnce();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string) as {
      parent: { database_id: string };
      properties: { Name: { title: Array<{ text: { content: string } }> } };
    };

    expect(body.parent.database_id).toBe("db-123");
    expect(body.properties.Name.title[0].text.content).toBe(
      "Login page crashes on Safari"
    );
  });
});
