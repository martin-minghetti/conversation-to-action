import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import {
  extractWhatsAppMessages,
  normalizeWhatsAppEvent,
} from "@/lib/connectors/whatsapp";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "Invalid verification request" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const encryptionKey = process.env.ENCRYPTION_KEY!;

  const { data: connections, error } = await supabase
    .from("connections")
    .select("*")
    .eq("type", "whatsapp")
    .eq("role", "source")
    .eq("status", "active");

  if (error || !connections || connections.length === 0) {
    return NextResponse.json({ error: "No active WhatsApp connections" }, { status: 400 });
  }

  // Check if any connection's verify_token matches
  for (const conn of connections) {
    try {
      const config = conn.config as { verifyToken?: string };
      const verifyToken = config.verifyToken;
      if (verifyToken && verifyToken === token) {
        return new NextResponse(challenge, { status: 200 });
      }
    } catch {
      // Continue
    }

    // Also try encrypted credentials
    try {
      const creds = JSON.parse(decrypt(conn.encrypted_credentials, encryptionKey)) as {
        verifyToken?: string;
      };
      if (creds.verifyToken && creds.verifyToken === token) {
        return new NextResponse(challenge, { status: 200 });
      }
    } catch {
      // Continue
    }
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = extractWhatsAppMessages(body);
  if (messages.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const supabase = createServiceClient();

  const { data: connections, error } = await supabase
    .from("connections")
    .select("*")
    .eq("type", "whatsapp")
    .eq("role", "source")
    .eq("status", "active");

  if (error || !connections || connections.length === 0) {
    return NextResponse.json({ error: "No active WhatsApp connections" }, { status: 400 });
  }

  const conn = connections[0];

  for (const msg of messages) {
    const canonical = normalizeWhatsAppEvent(msg, conn.workspace_id, conn.id);

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
  }

  return NextResponse.json({ ok: true });
}
