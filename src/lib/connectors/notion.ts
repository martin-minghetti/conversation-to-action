import type {
  SinkConnector,
  ExistingItem,
  ApprovedItem,
  ExternalItem,
} from "@/lib/connectors/types";
import { extractKeywords } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function notionHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

// ---------------------------------------------------------------------------
// notionConnector: SinkConnector
// ---------------------------------------------------------------------------
export const notionConnector: SinkConnector = {
  async searchExisting(
    credentials: string,
    query: string,
    config: Record<string, unknown>
  ): Promise<ExistingItem[]> {
    const databaseId = config.databaseId as string;
    const keywords = extractKeywords(query).slice(0, 3).join(" ");

    const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: "POST",
      headers: notionHeaders(credentials),
      body: JSON.stringify({
        filter: {
          property: "Name",
          title: { contains: keywords },
        },
      }),
    });

    const data = (await res.json()) as {
      results: Array<{
        id: string;
        properties: {
          Name: { title: Array<{ plain_text: string }> };
        };
        url: string;
      }>;
    };

    return data.results.map((page) => ({
      externalId: page.id,
      title: page.properties.Name.title.map((t) => t.plain_text).join(""),
      url: page.url,
      labels: [],
    }));
  },

  async createItem(
    credentials: string,
    item: ApprovedItem,
    config: Record<string, unknown>
  ): Promise<ExternalItem> {
    const databaseId = config.databaseId as string;

    const evidenceBlocks = item.evidence.map((e) => ({
      object: "block",
      type: "quote",
      quote: {
        rich_text: [{ type: "text", text: { content: e } }],
      },
    }));

    const children = [
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: item.description } }],
        },
      },
      {
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: "Evidence" } }],
        },
      },
      ...evidenceBlocks,
    ];

    const res = await fetch(`${NOTION_API}/pages`, {
      method: "POST",
      headers: notionHeaders(credentials),
      body: JSON.stringify({
        parent: { database_id: databaseId },
        properties: {
          Name: {
            title: [{ type: "text", text: { content: item.title } }],
          },
          Type: {
            select: { name: item.type },
          },
        },
        children,
      }),
    });

    const data = (await res.json()) as { id: string; url: string };

    return {
      externalId: data.id,
      url: data.url,
    };
  },

  async updateItem(
    credentials: string,
    externalId: string,
    item: ApprovedItem,
    _config: Record<string, unknown>
  ): Promise<ExternalItem> {
    const evidenceBlocks = item.evidence.map((e) => ({
      object: "block",
      type: "quote",
      quote: {
        rich_text: [{ type: "text", text: { content: e } }],
      },
    }));

    const children = [
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [
            { type: "text", text: { content: "Additional Evidence" } },
          ],
        },
      },
      ...evidenceBlocks,
    ];

    await fetch(`${NOTION_API}/blocks/${externalId}/children`, {
      method: "PATCH",
      headers: notionHeaders(credentials),
      body: JSON.stringify({ children }),
    });

    return {
      externalId,
      url: `https://notion.so/${externalId}`,
    };
  },

  async linkEvidence(
    credentials: string,
    externalId: string,
    permalinks: string[],
    _config: Record<string, unknown>
  ): Promise<void> {
    const children = permalinks.map((permalink) => ({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          { type: "text", text: { content: `Source: ${permalink}` } },
        ],
      },
    }));

    await fetch(`${NOTION_API}/blocks/${externalId}/children`, {
      method: "PATCH",
      headers: notionHeaders(credentials),
      body: JSON.stringify({ children }),
    });
  },
};
