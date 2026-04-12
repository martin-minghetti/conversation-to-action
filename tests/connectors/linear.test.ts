import { describe, it, expect, vi, beforeEach } from "vitest";
import { linearConnector } from "@/lib/connectors/linear";
import type { ApprovedItem } from "@/lib/connectors/types";
import fixtures from "../fixtures/linear_responses.json";

// ---------------------------------------------------------------------------
// Config & credentials
// ---------------------------------------------------------------------------
const testConfig = { teamId: "team-123" };
const testCreds = "lin_api_test_key";

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
describe("linearConnector.searchExisting", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("returns matching issues mapped to ExistingItem[]", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.search_with_match));

    const results = await linearConnector.searchExisting(
      testCreds,
      "login page crashes safari",
      testConfig
    );

    expect(results).toHaveLength(1);
    expect(results[0].externalId).toBe("abc-123");
    expect(results[0].title).toBe("Login page crashes on Safari");
    expect(results[0].url).toBe("https://linear.app/team/ENG-274");
    expect(results[0].labels).toContain("bug");
    expect(results[0].labels).toContain("auth");
  });

  it("returns empty array when no matches found", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.search_no_match));

    const results = await linearConnector.searchExisting(
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
describe("linearConnector.createItem", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("creates issue and returns external ID and URL", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.create_response));

    const result = await linearConnector.createItem(
      testCreds,
      makeApprovedItem(),
      testConfig
    );

    expect(result.externalId).toBe("def-456");
    expect(result.url).toBe("https://linear.app/team/ENG-300");
  });

  it("sends a mutation query containing 'issueCreate'", async () => {
    mockFetch.mockResolvedValue(mockJsonResponse(fixtures.create_response));

    await linearConnector.createItem(testCreds, makeApprovedItem(), testConfig);

    expect(mockFetch).toHaveBeenCalledOnce();
    const callArgs = mockFetch.mock.calls[0];
    const body = JSON.parse(callArgs[1].body as string) as { query: string };
    expect(body.query).toContain("issueCreate");
  });
});
