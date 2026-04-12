import Anthropic from "@anthropic-ai/sdk";
import { extractionResultSchema, type ExtractionResultSchema } from "./schemas";

const MAX_MESSAGES = 20;
const MAX_RETRIES = 1;
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 2048;

const SYSTEM_PROMPT = `You are an AI assistant that extracts actionable items from team conversations.

Your job is to identify and extract:
- **bugs**: reported problems, crashes, or broken functionality
- **features**: requests or plans for new capabilities
- **tasks**: concrete action items or work items assigned to someone
- **decisions**: explicit choices or approvals made during the conversation

Guidelines:
- Include exact quotes from the conversation as evidence
- Set confidence based on how explicit the item is:
  - 90-100: explicitly stated with clear intent
  - 70-89: implied but reasonably clear from context
  - 50-69: ambiguous, inferred from context
- Decisions are first-class artifacts — treat an explicit approval or choice as a "decision" item
- Set owner to the person responsible, or null if not assigned
- Return empty items array if there is no actionable content

You MUST return valid JSON matching this exact schema:
{
  "items": [
    {
      "type": "bug" | "feature" | "task" | "decision",
      "title": "string (max 80 chars)",
      "description": "string",
      "owner": "string or null",
      "evidence": ["array of exact quotes"],
      "confidence": number (0-100),
      "suggestedLabels": ["array of strings"]
    }
  ],
  "threadSummary": "string"
}

Return ONLY the JSON object, no markdown, no explanation.`;

export interface MessageInput {
  author: string;
  text: string;
  timestamp: string;
}

export interface MessagesCreateClient {
  messagesCreate: (params: Anthropic.MessageCreateParamsNonStreaming) => Promise<Anthropic.Message>;
}

export function buildExtractionPrompt(messages: MessageInput[]): string {
  const window = messages.slice(-MAX_MESSAGES);
  const formatted = window
    .map((m) => `[${m.author}] (${m.timestamp}): ${m.text}`)
    .join("\n");
  return formatted;
}

export async function extractItems(
  messages: MessageInput[],
  apiKey: string,
  client?: MessagesCreateClient
): Promise<ExtractionResultSchema> {
  const resolvedClient: MessagesCreateClient = client ?? new Anthropic({ apiKey });

  const userPrompt = buildExtractionPrompt(messages);

  const callClaude = async (): Promise<ExtractionResultSchema | null> => {
    const response = await resolvedClient.messagesCreate({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    try {
      const parsed = JSON.parse(textBlock.text);
      const validated = extractionResultSchema.parse(parsed);
      return validated;
    } catch {
      return null;
    }
  };

  // Initial attempt
  const firstResult = await callClaude();
  if (firstResult !== null) return firstResult;

  // Retry up to MAX_RETRIES times
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const retryResult = await callClaude();
    if (retryResult !== null) return retryResult;
  }

  // Final fallback
  return { items: [], threadSummary: "Extraction failed" };
}
