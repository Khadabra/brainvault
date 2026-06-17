import { ChunkVector } from "../services/dbService";

/**
 * Calculates the cosine similarity score between two multi-dimensional vectors.
 * Formula: (A dapat dikalikan dot (•) B) / (Magnitude A * Magnitude B)
 * 
 * Safety features included:
 * - Handles unequal vector lengths safely (returns 0 or logs error)
 * - Avoids Division-by-Zero if one of the vectors is zero-filled (returns 0)
 * - Normalizes and clamps scores gracefully between [-1, 1]
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  // Graceful resolution for length mismatch
  if (vecA.length !== vecB.length) {
    console.warn(`[vectorMath] Length mismatch detected: Vector A is ${vecA.length} and Vector B is ${vecB.length}.`);
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  // Magnitude is the square root of the sum of squares
  const magnitudeA = Math.sqrt(normA);
  const magnitudeB = Math.sqrt(normB);

  // Avoid division-by-zero for null/zero vectors
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Strict clamp boundary fallback to avoid floating point precision escape
  return Math.max(-1, Math.min(1, similarity));
}

export interface RankedChunkResult {
  chunk: ChunkVector;
  score: number;
}

/**
 * Compares a query vector against multiple document chunk vectors and ranks them.
 * Offers optional threshold filtering if requested.
 *
 * @param queryEmbedding - The embedding vector of the search query
 * @param chunks - List of stored ChunkVectors loaded from IndexedDB
 * @param topK - Maximum number of nearest neighbors to return (defaults to 5)
 */
export function rankBySimilarity(
  queryEmbedding: number[],
  chunks: ChunkVector[],
  topK: number = 5
): RankedChunkResult[] {
  if (!queryEmbedding || queryEmbedding.length === 0 || !chunks || chunks.length === 0) {
    return [];
  }

  const scoredResults: RankedChunkResult[] = chunks.map((chunk) => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      chunk,
      score,
    };
  });

  // Sort by score in descending order (highest similarity first)
  scoredResults.sort((a, b) => b.score - a.score);

  // Return the best topK elements
  return scoredResults.slice(0, topK);
}
