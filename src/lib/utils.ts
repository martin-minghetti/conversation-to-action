const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "and", "but", "or", "not", "nor", "so", "yet",
  "it", "its", "this", "that", "these", "those",
  "i", "we", "you", "he", "she", "they", "me", "us", "him", "her", "them",
  "my", "your", "his", "our", "their",
  "what", "which", "who", "whom", "when", "where", "why", "how",
  "all", "each", "every", "both", "few", "more", "most", "other", "some", "such",
  "no", "only", "same", "than", "too", "very", "just", "can", "will",
  "would", "could", "should", "may", "might", "do", "did", "does",
  "has", "have", "had", "after", "before", "about", "up", "out", "if", "as",
]);

/**
 * Extracts meaningful keywords from text.
 * Lowercases, removes non-alphanumeric characters, splits on whitespace,
 * filters words longer than 2 chars and not in STOP_WORDS.
 */
export function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Computes Jaccard similarity between the keyword sets of two strings.
 * Returns 1 if both sets are empty, 0 if only one set is empty.
 */
export function stringSimilarity(a: string, b: string): number {
  const setA = new Set(extractKeywords(a));
  const setB = new Set(extractKeywords(b));

  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((word) => setB.has(word)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}
