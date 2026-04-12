import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import {
  verifySlackSignature,
  normalizeSlackEvent,
} from "@/lib/connectors/slack";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();

  // Parse JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(body) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // URL verification challenge
  if (parsed.type === "url_verification") {
    return NextResponse.json({ challenge: parsed.challenge });
  }

  // Verify HMAC signature
  const timestamp = req.headers.get("x-slack-request-timestamp") ?? "";
  const signature = req.headers.get("x-slack-signature") ?? "";

  if (!timestamp || !signature) {
    return NextResponse.json({ error: "Missing Slack signature headers" }, { status: 401 });
  }

  // Look up active Slack source connections
  const supabase = createServiceClient();
  const { data: connections, error: connErr } = await supabase
    .from("connections")
    .select("*")
    .eq("type", "slack")
    .eq("role", "source")
    .eq("status", "active");

  if (connErr || !connections || connections.length === 0) {
    return NextResponse.json({ error: "No active Slack connections" }, { status: 400 });
  }

  const encryptionKey = process.env.ENCRYPTION_KEY!;

  // Try each connection's signing secret to find the matching one
  let matchedConnection: (typeof connections)[number] | null = null;
  for (const conn of connections) {
    try {
      const creds = JSON.parse(decrypt(conn.encrypted_credentials, encryptionKey)) as {
        signingSecret: string;
      };
      const valid = verifySlackSignature(body, timestamp, signature, creds.signingSecret);
      if (valid) {
        matchedConnection = conn;
        break;
      }
    } catch {
      // Continue trying other connections
    }
  }

  if (!matchedConnection) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Only process message events without subtype
  const event = parsed.event as
    | { type: string; subtype?: string }
    | undefined;

  if (!event || event.type !== "message" || event.subtype) {
    return NextResponse.json({ ok: true });
  }

  // Normalize the event
  const canonical = normalizeSlackEvent(
    parsed,
    matchedConnection.workspace_id,
    matchedConnection.id
  );

  // Upsert into events table
  await supabase.from("events").upsert(
    {
      workspace_id: canonical.workspaceId,
      connection_id: canonical.connectionId,
      source_message_id: canonical.sourceMessageId,
      channel_id: canonical.channelId,
      thread_id: canonical.threadId,
      author: canonical.author,
      text: canonical.text,
      permalink: canonical.permalink,
      message_timestamp: canonical.timestamp.toISOString(),
      processed: false,
      error: null,
    },
    { onConflict: "connection_id,source_message_id" }
  );

  return NextResponse.json({ ok: true });
}
