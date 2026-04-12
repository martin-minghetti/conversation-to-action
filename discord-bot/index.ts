import { Client, GatewayIntentBits, Events } from "discord.js";
import { normalizeMessage } from "./normalize.js";

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
const VERCEL_API_URL = process.env.VERCEL_API_URL ?? "";
const DISCORD_BRIDGE_SECRET = process.env.DISCORD_BRIDGE_SECRET ?? "";
const DISCORD_TOKEN = process.env.DISCORD_TOKEN ?? "";
const WORKSPACE_ID = process.env.WORKSPACE_ID ?? "";
const CONNECTION_ID = process.env.CONNECTION_ID ?? "";
const MONITORED_CHANNELS_RAW = process.env.MONITORED_CHANNELS ?? "";

const monitoredChannels: Set<string> =
  MONITORED_CHANNELS_RAW.trim().length > 0
    ? new Set(MONITORED_CHANNELS_RAW.split(",").map((c) => c.trim()).filter(Boolean))
    : new Set();

// ---------------------------------------------------------------------------
// Discord client
// ---------------------------------------------------------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Discord bot ready as ${readyClient.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  // Filter by monitored channels if configured
  if (monitoredChannels.size > 0 && !monitoredChannels.has(message.channelId)) {
    return;
  }

  // Build raw message object compatible with normalizeMessage
  const rawMsg = {
    id: message.id,
    channel_id: message.channelId,
    author: {
      id: message.author.id,
      username: message.author.username,
      bot: message.author.bot,
    },
    content: message.content,
    timestamp: message.createdAt.toISOString(),
    message_reference: message.reference?.messageId
      ? { message_id: message.reference.messageId }
      : undefined,
  };

  const event = normalizeMessage(rawMsg, WORKSPACE_ID, CONNECTION_ID);

  if (!event) {
    return;
  }

  try {
    const response = await fetch(`${VERCEL_API_URL}/api/events/discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DISCORD_BRIDGE_SECRET}`,
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`Failed to forward event: ${response.status} ${text}`);
    }
  } catch (err) {
    console.error("Error forwarding Discord event:", err);
  }
});

client.login(DISCORD_TOKEN);
