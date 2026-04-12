export interface CanonicalEvent {
  source: "slack" | "discord" | "whatsapp";
  workspaceId: string;
  connectionId: string;
  sourceMessageId: string;
  channelId: string;
  threadId: string | null;
  author: string;
  text: string;
  permalink: string | null;
  timestamp: Date;
}

export interface ExtractedItem {
  type: "bug" | "feature" | "task" | "decision";
  title: string;
  description: string;
  owner: string | null;
  evidence: string[];
  confidence: number;
  suggestedLabels: string[];
}

export interface ExtractionResult {
  items: ExtractedItem[];
  threadSummary: string;
}

export interface ExistingItem {
  externalId: string;
  title: string;
  url: string;
  labels: string[];
}

export interface DedupResult {
  match: ExistingItem | null;
  similarity: number;
  action: "create" | "update" | "ambiguous";
}

export interface ResolvedItem extends ExtractedItem {
  dedup: DedupResult;
}

export interface ApprovedItem {
  type: "bug" | "feature" | "task" | "decision";
  title: string;
  description: string;
  owner: string | null;
  suggestedLabels: string[];
  evidence: string[];
  dedupAction: "create" | "update";
  dedupMatchId: string | null;
}

export interface ExternalItem {
  externalId: string;
  url: string;
}

export interface InteractionResult {
  itemIndex: number;
  action: "approve" | "reject" | "edit";
  editedTitle?: string;
  editedDescription?: string;
}

export interface SourceConnector {
  normalizeEvent(raw: unknown): CanonicalEvent;
  sendReview(
    credentials: string,
    channelId: string,
    threadId: string | null,
    items: ResolvedItem[]
  ): Promise<string>;
  parseInteraction(raw: unknown): InteractionResult;
}

export interface SinkConnector {
  searchExisting(
    credentials: string,
    query: string,
    config: Record<string, unknown>
  ): Promise<ExistingItem[]>;
  createItem(
    credentials: string,
    item: ApprovedItem,
    config: Record<string, unknown>
  ): Promise<ExternalItem>;
  updateItem(
    credentials: string,
    externalId: string,
    item: ApprovedItem,
    config: Record<string, unknown>
  ): Promise<ExternalItem>;
  linkEvidence(
    credentials: string,
    externalId: string,
    permalinks: string[],
    config: Record<string, unknown>
  ): Promise<void>;
}
