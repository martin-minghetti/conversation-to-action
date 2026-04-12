import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { processUnprocessedEvents } from "@/lib/pipeline/process";
import { slackConnector } from "@/lib/connectors/slack";
import { discordConnector } from "@/lib/connectors/discord";
import { whatsappConnector } from "@/lib/connectors/whatsapp";
import { linearConnector } from "@/lib/connectors/linear";
import { notionConnector } from "@/lib/connectors/notion";
import type { SourceConnector, SinkConnector, ApprovedItem } from "@/lib/connectors/types";
import type { Connection, Item, ItemSource } from "@/lib/database.types";

// ---------------------------------------------------------------------------
// Connector maps
// ---------------------------------------------------------------------------
const SOURCE_CONNECTORS: Record<string, SourceConnector> = {
  slack: slackConnector,
  discord: discordConnector,
  whatsapp: whatsappConnector,
};

const SINK_CONNECTORS: Record<string, SinkConnector> = {
  linear: linearConnector,
  notion: notionConnector,
};

// ---------------------------------------------------------------------------
// GET /api/cron/process
// Triggered by Vercel Cron every minute.
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest): Promise<NextResponse> {
  // 1. Verify Authorization header
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const encryptionKey = process.env.ENCRYPTION_KEY!;
  let processed = 0;

  // 2. Get all workspaces with unprocessed events
  const { data: workspaceRows, error: wsError } = await supabase
    .from("events")
    .select("workspace_id")
    .eq("processed", false) as { data: Array<{ workspace_id: string }> | null; error: unknown };

  if (!wsError && workspaceRows && workspaceRows.length > 0) {
    // Deduplicate workspace IDs
    const workspaceIds = [...new Set(workspaceRows.map((r) => r.workspace_id))];

    // 3. Process unprocessed events per workspace
    for (const workspaceId of workspaceIds) {
      // a. Get all active connections for this workspace
      const { data: connections, error: connError } = await supabase
        .from("connections")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("status", "active") as { data: Connection[] | null; error: unknown };

      if (connError || !connections || connections.length === 0) continue;

      // b. Find AI, source, and sink connections
      const aiConn = connections.find(
        (c) => c.type === "anthropic" && c.role === "ai"
      );
      const sourceConns = connections.filter((c) => c.role === "source");
      const sinkConn = connections.find((c) => c.role === "sink");

      if (!aiConn || sourceConns.length === 0 || !sinkConn) continue;

      // c. Decrypt credentials
      let anthropicKey: string;
      let sinkCredentials: string;

      try {
        anthropicKey = decrypt(aiConn.encrypted_credentials, encryptionKey);
        sinkCredentials = decrypt(sinkConn.encrypted_credentials, encryptionKey);
      } catch {
        continue;
      }

      // d. Map sink connector
      const sinkConnector = SINK_CONNECTORS[sinkConn.type];
      if (!sinkConnector) continue;

      // e. Process unprocessed events for each source connection
      for (const sourceConn of sourceConns) {
        const sourceConnector = SOURCE_CONNECTORS[sourceConn.type];
        if (!sourceConnector) continue;

        let sourceCredentials: string;
        try {
          sourceCredentials = decrypt(sourceConn.encrypted_credentials, encryptionKey);
        } catch {
          continue;
        }

        try {
          await processUnprocessedEvents(
            workspaceId,
            anthropicKey,
            sourceConnector,
            sourceCredentials,
            sinkConnector,
            sinkCredentials,
            sinkConn.config
          );
          processed++;
        } catch {
          // Continue processing other connections/workspaces
        }
      }
    }
  }

  // 4. Push approved items
  const { data: approvedItems, error: itemsError } = await supabase
    .from("items")
    .select("*")
    .eq("status", "approved")
    .limit(50) as { data: Item[] | null; error: unknown };

  if (!itemsError && approvedItems && approvedItems.length > 0) {
    for (const item of approvedItems) {
      // Find the sink connection for this item's workspace
      const { data: connections } = await supabase
        .from("connections")
        .select("*")
        .eq("workspace_id", item.workspace_id)
        .eq("role", "sink")
        .eq("status", "active")
        .limit(1) as { data: Connection[] | null; error: unknown };

      const sinkConn = connections?.[0];
      if (!sinkConn) continue;

      const sinkConnector = SINK_CONNECTORS[sinkConn.type];
      if (!sinkConnector) continue;

      let sinkCredentials: string;
      try {
        sinkCredentials = decrypt(sinkConn.encrypted_credentials, encryptionKey);
      } catch {
        continue;
      }

      // Check sync_log for idempotency
      const { data: existingLog } = await supabase
        .from("sync_log")
        .select("id")
        .eq("item_id", item.id)
        .eq("connection_id", sinkConn.id)
        .in("action", ["create", "update"])
        .limit(1) as { data: Array<{ id: string }> | null; error: unknown };

      if (existingLog && existingLog.length > 0) {
        // Already synced — mark as pushed and skip
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("items").update({ status: "pushed" }).eq("id", item.id);
        continue;
      }

      // Fetch evidence from item_sources
      const { data: itemSources } = await supabase
        .from("item_sources")
        .select("evidence_quote")
        .eq("item_id", item.id) as { data: Array<Pick<ItemSource, "evidence_quote">> | null; error: unknown };

      const evidence = itemSources?.map((s) => s.evidence_quote) ?? [];

      const approvedItem: ApprovedItem = {
        type: item.type,
        title: item.title,
        description: item.description,
        owner: item.owner,
        suggestedLabels: item.suggested_labels,
        evidence,
        dedupAction: (item.dedup_action === "update" ? "update" : "create") as "create" | "update",
        dedupMatchId: item.dedup_match_id,
      };

      try {
        let externalItem: { externalId: string; url: string };
        const action = approvedItem.dedupAction;

        if (action === "update" && approvedItem.dedupMatchId) {
          externalItem = await sinkConnector.updateItem(
            sinkCredentials,
            approvedItem.dedupMatchId,
            approvedItem,
            sinkConn.config
          );
        } else {
          externalItem = await sinkConnector.createItem(
            sinkCredentials,
            approvedItem,
            sinkConn.config
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabase as any;

        // Log to sync_log
        await db.from("sync_log").insert({
          item_id: item.id,
          connection_id: sinkConn.id,
          action,
          external_id: externalItem.externalId,
          request_payload: { title: item.title },
          response_status: 200,
        });

        // Update item status to pushed
        await db.from("items").update({
          status: "pushed",
          external_id: externalItem.externalId,
          external_url: externalItem.url,
        }).eq("id", item.id);
      } catch {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from("items").update({ status: "failed" }).eq("id", item.id);
      }
    }
  }

  return NextResponse.json({ processed });
}
