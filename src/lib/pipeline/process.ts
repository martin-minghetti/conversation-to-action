import type { SourceConnector, SinkConnector } from "@/lib/connectors/types";
import { extractItems } from "@/lib/pipeline/extract";
import { resolveItems } from "@/lib/pipeline/resolve";
import { createServiceClient } from "@/lib/supabase";
import type { Event } from "@/lib/database.types";

export interface EventLike {
  channel_id: string;
  thread_id?: string | null;
  text: string;
  author: string;
  message_timestamp: string;
}

/**
 * Groups events by thread. Key format:
 * - Threaded messages: "${channel_id}:${thread_id}"
 * - Non-threaded messages: "${channel_id}:_"
 *
 * Filters out groups with fewer than minMessages events.
 */
export function groupByThread<T extends EventLike>(
  events: T[],
  minMessages = 1
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const event of events) {
    const key = `${event.channel_id}:${event.thread_id ?? "_"}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(event);
  }

  // Filter out groups below threshold
  for (const key of Object.keys(groups)) {
    if (groups[key].length < minMessages) {
      delete groups[key];
    }
  }

  return groups;
}

/**
 * Main pipeline orchestrator.
 * Fetches unprocessed events, groups by thread, extracts and resolves items,
 * persists to DB, sends review to source, and marks events as processed.
 */
export async function processUnprocessedEvents(
  workspaceId: string,
  anthropicKey: string,
  sourceConnector: SourceConnector,
  sourceCredentials: string,
  sinkConnector: SinkConnector,
  sinkCredentials: string,
  sinkConfig: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient();

  // 1. Fetch unprocessed events
  const { data: events, error } = await supabase
    .from("events")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("processed", false)
    .limit(100);

  if (error || !events || events.length === 0) return;

  // 2. Group by thread (minimum 3 messages)
  const groups = groupByThread(events, 3);

  // 3. Process each thread group
  for (const [_key, threadEvents] of Object.entries(groups)) {
    const eventIds = threadEvents.map((e) => e.id);
    const channelId = threadEvents[0].channel_id;
    const threadId = threadEvents[0].thread_id ?? null;

    // a. Convert to ThreadMessage[]
    const messages = threadEvents.map((e) => ({
      author: e.author,
      text: e.text,
      timestamp: e.message_timestamp,
    }));

    // b. Extract items via AI
    const extractionResult = await extractItems(messages, anthropicKey);

    // c. If no items, mark as processed and continue
    if (extractionResult.items.length === 0) {
      await supabase
        .from("events")
        .update({ processed: true })
        .in("id", eventIds);
      continue;
    }

    // d. Resolve items against sink (dedup)
    const resolvedItems = await resolveItems(
      extractionResult.items,
      sinkConnector,
      sinkConfig,
      sinkCredentials
    );

    // e. Insert items into `items` table
    const { data: insertedItems, error: insertError } = await supabase
      .from("items")
      .insert(
        resolvedItems.map((item) => ({
          workspace_id: workspaceId,
          type: item.type,
          title: item.title,
          description: item.description,
          owner: item.owner,
          confidence: item.confidence,
          suggested_labels: item.suggestedLabels,
          status: "pending" as const,
          dedup_action: item.dedup.action,
          dedup_match_id: item.dedup.match?.externalId ?? null,
          dedup_similarity: item.dedup.similarity,
          external_id: null,
          external_url: null,
          source_channel_id: channelId,
          source_thread_id: threadId,
          source_connection_id: null,
          review_message_id: null,
        }))
      )
      .select("id");

    if (insertError || !insertedItems) {
      continue;
    }

    // f. Link evidence via `item_sources` table
    const itemSources = insertedItems.flatMap((insertedItem, idx) => {
      const resolved = resolvedItems[idx];
      return threadEvents
        .filter((e) => resolved.evidence.some((ev) => e.text.includes(ev)))
        .map((e) => ({
          item_id: insertedItem.id,
          event_id: e.id,
          evidence_quote: resolved.evidence[0] ?? e.text,
        }));
    });

    if (itemSources.length > 0) {
      await supabase.from("item_sources").insert(itemSources);
    }

    // g. Send review to source channel
    await sourceConnector.sendReview(
      sourceCredentials,
      channelId,
      threadId,
      resolvedItems
    );

    // h. Mark events as processed
    await supabase
      .from("events")
      .update({ processed: true })
      .in("id", eventIds);
  }
}
