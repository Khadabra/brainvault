import { DocumentChunk } from "../types/document";

/**
 * Tokenize a text string into healthy normalized terms.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'\[\]]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1);
}

/**
 * Ranks all chunks of an active document based on keyword relevance to the user's query
 * using a standardized client-side TF-IDF scoring algorithm.
 * 
 * @param query The user's query/question
 * @param chunks The full list of indexed chunks for the active document
 * @param topK How many most-relevant chunks to retrieve
 */
export function retrieveRelevantChunks(
  query: string,
  chunks: DocumentChunk[],
  topK = 5
): DocumentChunk[] {
  if (!chunks || chunks.length === 0) return [];

  const queryTerms = tokenize(query);
  if (queryTerms.length === 0) {
    // If query has no search terms, return the first set of chunks
    return chunks.slice(0, topK);
  }

  // 1. Calculate Document Frequency (DF) for each query term
  const termDF: { [term: string]: number } = {};
  queryTerms.forEach((term) => {
    termDF[term] = 0;
  });

  chunks.forEach((chunk) => {
    const chunkTermsSet = new Set(tokenize(chunk.text));
    queryTerms.forEach((term) => {
      if (chunkTermsSet.has(term)) {
        termDF[term]++;
      }
    });
  });

  // 2. Calculate Inverse Document Frequency (IDF) with smoothing
  const N = chunks.length;
  const termIDF: { [term: string]: number } = {};
  queryTerms.forEach((term) => {
    const df = termDF[term] || 0;
    // Classic smoothed IDF
    termIDF[term] = Math.log(1 + (N - df + 0.5) / (df + 0.5));
  });

  // 3. Score each chunk
  interface ScoredChunk {
    chunk: DocumentChunk;
    score: number;
  }

  const scoredChunks: ScoredChunk[] = chunks.map((chunk) => {
    const chunkTerms = tokenize(chunk.text);
    const termCountInChunk: { [term: string]: number } = {};
    
    chunkTerms.forEach((term) => {
      termCountInChunk[term] = (termCountInChunk[term] || 0) + 1;
    });

    let score = 0;
    queryTerms.forEach((term) => {
      if (termCountInChunk[term]) {
        const tf = termCountInChunk[term];
        const tfWeight = 1 + Math.log(tf);
        const idfWeight = termIDF[term] || 0;
        score += tfWeight * idfWeight;
      }
    });

    return { chunk, score };
  });

  // Filter matched chunks
  const matches = scoredChunks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.chunk);

  if (matches.length > 0) {
    return matches.slice(0, topK);
  }

  // Fallback: If no keywords match exactly, return the first few chunks
  return chunks.slice(0, topK);
}
