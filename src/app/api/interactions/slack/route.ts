import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";
import { parseSlackInteraction } from "@/lib/connectors/slack";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // Slack interactions are sent as application/x-www-form-urlencoded
  let payloadStr: string;
  try {
    const formData = await req.formData();
    payloadStr = formData.get("payload") as string;
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  if (!payloadStr) {
    return NextResponse.json({ error: "Missing payload" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(payloadStr);
  } catch {
    return NextResponse.json({ error: "Invalid payload JSON" }, { status: 400 });
  }

  // Parse the interaction
  const interaction = parseSlackInteraction(payload);

  // Extract the message ts from the payload to find items by review_message_id
  const p = payload as {
    message?: { ts?: string };
    container?: { message_ts?: string };
  };
  const messageTs = p.message?.ts ?? p.container?.message_ts;

  if (!messageTs) {
    return NextResponse.json({ error: "Cannot determine message ts" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Find items matching this review message
  const { data: itemsRaw, error } = await supabase
    .from("items")
    .select("*")
    .eq("review_message_id", messageTs)
    .eq("status", "pending");

  const items = itemsRaw as Array<{ id: string }> | null;

  if (error || !items || items.length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Find the specific item by index
  const item = items[interaction.itemIndex];
  if (!item) {
    return NextResponse.json({ ok: true });
  }

  const newStatus = interaction.action === "approve" ? "approved" : "rejected";

  await supabase
    .from("items")
    .update({ status: newStatus } as any)
    .eq("id", item.id);

  return NextResponse.json({ ok: true });
}
