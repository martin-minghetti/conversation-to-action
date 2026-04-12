import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import type { CanonicalEvent } from "@/lib/connectors/types";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Verify Authorization header
  const authHeader = req.headers.get("authorization") ?? "";
  const expectedSecret = process.env.DISCORD_BRIDGE_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON body (already a CanonicalEvent from the Discord bot)
  let canonical: CanonicalEvent;
  try {
    canonical = (await req.json()) as CanonicalEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const supabase = createServiceClient();

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
      message_timestamp: new Date(canonical.timestamp).toISOString(),
      processed: false,
      error: null,
    } as any,
    { onConflict: "connection_id,source_message_id" }
  );

  return NextResponse.json({ ok: true });
}
