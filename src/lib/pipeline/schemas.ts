import { z } from "zod";

export const extractedItemSchema = z.object({
  type: z.enum(["bug", "feature", "task", "decision"]),
  title: z.string().max(80),
  description: z.string(),
  owner: z.string().nullable(),
  evidence: z.array(z.string()),
  confidence: z.number().min(0).max(100),
  suggestedLabels: z.array(z.string()),
});

export const extractionResultSchema = z.object({
  items: z.array(extractedItemSchema),
  threadSummary: z.string(),
});

export type ExtractedItemSchema = z.infer<typeof extractedItemSchema>;
export type ExtractionResultSchema = z.infer<typeof extractionResultSchema>;
