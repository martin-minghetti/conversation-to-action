import type {
  ExtractedItem,
  ResolvedItem,
  SinkConnector,
} from "@/lib/connectors/types";
import { stringSimilarity } from "@/lib/utils";

const MATCH_THRESHOLD = 0.7;
const AMBIGUITY_CONFIDENCE_PENALTY = 15;

/**
 * Resolves a list of extracted items against existing items in the sink.
 * For each item, queries the sink, scores candidates by title similarity,
 * and assigns a dedup action: "create", "update", or "ambiguous".
 */
export async function resolveItems(
  items: ExtractedItem[],
  sink: SinkConnector,
  sinkConfig: Record<string, unknown>,
  credentials: string
): Promise<ResolvedItem[]> {
  const resolved: ResolvedItem[] = [];

  for (const item of items) {
    let dedupAction: "create" | "update" | "ambiguous" = "create";
    let bestMatch = null;
    let bestSimilarity = 0;
    let confidence = item.confidence;

    try {
      const candidates = await sink.searchExisting(credentials, item.title, sinkConfig);

      // Score each candidate
      const scored = candidates.map((candidate) => ({
        candidate,
        similarity: stringSimilarity(item.title, candidate.title),
      }));

      // Sort descending by similarity
      scored.sort((a, b) => b.similarity - a.similarity);

      const best = scored[0];
      const second = scored[1];

      if (best && best.similarity >= MATCH_THRESHOLD) {
        bestMatch = best.candidate;
        bestSimilarity = best.similarity;

        // Check for ambiguity: second-best also close enough
        if (second && second.similarity >= MATCH_THRESHOLD * 0.85) {
          dedupAction = "ambiguous";
          confidence = Math.max(0, confidence - AMBIGUITY_CONFIDENCE_PENALTY);
        } else {
          dedupAction = "update";
        }
      }
    } catch {
      // Sink search failure: default to "create"
      dedupAction = "create";
      bestMatch = null;
      bestSimilarity = 0;
    }

    resolved.push({
      ...item,
      confidence,
      dedup: {
        match: bestMatch,
        similarity: bestSimilarity,
        action: dedupAction,
      },
    });
  }

  return resolved;
}
