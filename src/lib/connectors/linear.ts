import type {
  SinkConnector,
  ExistingItem,
  ApprovedItem,
  ExternalItem,
} from "@/lib/connectors/types";
import { extractKeywords } from "@/lib/utils";

// ---------------------------------------------------------------------------
// GraphQL helper
// ---------------------------------------------------------------------------
async function linearQuery(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
): Promise<unknown> {
  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  return res.json();
}

// ---------------------------------------------------------------------------
// linearConnector: SinkConnector
// ---------------------------------------------------------------------------
export const linearConnector: SinkConnector = {
  async searchExisting(
    credentials: string,
    query: string,
    config: Record<string, unknown>
  ): Promise<ExistingItem[]> {
    const teamId = config.teamId as string;
    const keywords = extractKeywords(query).slice(0, 3);
    const searchTerm = keywords.join(" ");

    const gql = `
      query SearchIssues($filter: IssueFilter) {
        issues(filter: $filter) {
          nodes {
            id
            title
            url
            labels {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const variables = {
      filter: {
        team: { id: { eq: teamId } },
        title: { contains: searchTerm },
      },
    };

    const data = (await linearQuery(credentials, gql, variables)) as {
      data: {
        issues: {
          nodes: Array<{
            id: string;
            title: string;
            url: string;
            labels: { nodes: Array<{ name: string }> };
          }>;
        };
      };
    };

    return data.data.issues.nodes.map((node) => ({
      externalId: node.id,
      title: node.title,
      url: node.url,
      labels: node.labels.nodes.map((l) => l.name),
    }));
  },

  async createItem(
    credentials: string,
    item: ApprovedItem,
    config: Record<string, unknown>
  ): Promise<ExternalItem> {
    const teamId = config.teamId as string;

    const evidenceSection =
      item.evidence.length > 0
        ? "\n\n**Evidence:**\n" + item.evidence.map((e) => `> ${e}`).join("\n")
        : "";

    const description = item.description + evidenceSection;

    const gql = `
      mutation issueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            url
          }
        }
      }
    `;

    const variables = {
      input: {
        teamId,
        title: item.title,
        description,
      },
    };

    const data = (await linearQuery(credentials, gql, variables)) as {
      data: {
        issueCreate: {
          success: boolean;
          issue: { id: string; url: string };
        };
      };
    };

    return {
      externalId: data.data.issueCreate.issue.id,
      url: data.data.issueCreate.issue.url,
    };
  },

  async updateItem(
    credentials: string,
    externalId: string,
    item: ApprovedItem,
    _config: Record<string, unknown>
  ): Promise<ExternalItem> {
    const evidenceSection =
      item.evidence.length > 0
        ? "\n\n**Evidence:**\n" + item.evidence.map((e) => `> ${e}`).join("\n")
        : "";

    const description = item.description + evidenceSection;

    const gql = `
      mutation issueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            url
          }
        }
      }
    `;

    const variables = {
      id: externalId,
      input: {
        description,
      },
    };

    const data = (await linearQuery(credentials, gql, variables)) as {
      data: {
        issueUpdate: {
          success: boolean;
          issue: { id: string; url: string };
        };
      };
    };

    return {
      externalId: data.data.issueUpdate.issue.id,
      url: data.data.issueUpdate.issue.url,
    };
  },

  async linkEvidence(
    credentials: string,
    externalId: string,
    permalinks: string[],
    _config: Record<string, unknown>
  ): Promise<void> {
    const body = "**Sources:**\n" + permalinks.map((p) => `- ${p}`).join("\n");

    const gql = `
      mutation commentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
        }
      }
    `;

    const variables = {
      input: {
        issueId: externalId,
        body,
      },
    };

    await linearQuery(credentials, gql, variables);
  },
};
