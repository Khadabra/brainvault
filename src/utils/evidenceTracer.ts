import { Document } from "../types/document";
import { SourceCitation } from "../types/chat";

/**
 * Searches the active workspace documents for content matching the provided finding or audit segment.
 * Uses exact regex matching for document/page references first, and falls back to keyword-similarity scoring.
 */
export function traceEvidence(
  findingText: string,
  documents: Document[],
  selectedIndustry: string
): SourceCitation {
  if (!findingText || documents.length === 0) {
    return {
      id: "manual-verify-" + Math.floor(Math.random() * 10000),
      text: findingText,
      pageNum: 1,
      documentName: "Dokumen tidak teridentifikasi",
      isManualVerify: true,
    };
  }

  const textLower = findingText.toLowerCase();

  // 1. Try to parse Page Number
  let pageNum = 1;
  const pageMatch = textLower.match(/(?:halaman|hal|page|hal\s证据|\bh\b)\s*([0-9]+)/i);
  if (pageMatch) {
    pageNum = parseInt(pageMatch[1], 10);
  }

  // 2. Try to identify which document is referred to
  let matchedDoc = documents[0]; // default fallback to first active document

  // Look for index-based references like "Dokumen 01", "Dokumen 1", "Dokumen 02", "Dokumen 2"
  const docNumMatch = textLower.match(/(?:dokumen|doc)\s*([0-9]+)/i);
  if (docNumMatch) {
    const docIdx = parseInt(docNumMatch[1], 10) - 1;
    if (docIdx >= 0 && docIdx < documents.length) {
      matchedDoc = documents[docIdx];
    }
  } else {
    // Look for name content matches
    for (const doc of documents) {
      const cleanDocName = doc.name.toLowerCase();
      // If document name matches some keywords in the finding text
      if (
        textLower.includes(cleanDocName) ||
        textLower.includes(cleanDocName.slice(0, 15))
      ) {
        matchedDoc = doc;
        break;
      }
    }
  }

  // 3. Look up the specific chunk for the matched page
  const chunks = matchedDoc.chunks || [];
  const pageChunk = chunks.find((c) => c.pageNum === pageNum);

  if (pageChunk) {
    // Extract a representative quote (kutipan) from the chunk that resembles the finding text,
    // or use a smart slice of the chunk text
    return {
      id: "traced-" + Math.floor(Math.random() * 100000),
      text: findingText.length > 150 ? findingText.slice(0, 150) + "..." : findingText,
      pageNum: pageNum,
      documentName: matchedDoc.name,
      docId: matchedDoc.id,
      docName: matchedDoc.name,
      fullParagraph: pageChunk.text,
      isManualVerify: false,
    };
  }

  // 4. FALLBACK: Keyword-based semantic overlap search across all chunks of all documents
  // Tokenize finding text to extract keywords
  const stopwords = new Set([
    "yang", "dan", "untuk", "dengan", "atau", "adalah", "pada", "oleh", "dari", 
    "dalam", "bisa", "akan", "telah", "tidak", "pada", "juga", "dengan", "lebih",
    "kritis", "sedang", "minor", "temuan", "risiko", "rujukan", "halaman", "dokumen"
  ]);

  const cleanWords = textLower
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 4 && !stopwords.has(w));

  let bestChunk = null;
  let bestDoc = null;
  let maxScore = 0;

  for (const doc of documents) {
    const docChunks = doc.chunks || [];
    for (const chunk of docChunks) {
      const chunkTextLower = chunk.text.toLowerCase();
      let score = 0;
      for (const word of cleanWords) {
        if (chunkTextLower.includes(word)) {
          score += 1;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        bestChunk = chunk;
        bestDoc = doc;
      }
    }
  }

  // Select the chunk only if it has respectable keyword match score (e.g. at least 2 keywords match)
  if (bestChunk && bestDoc && maxScore >= 2) {
    return {
      id: "traced-" + Math.floor(Math.random() * 100000),
      text: findingText.length > 150 ? findingText.slice(0, 150) + "..." : findingText,
      pageNum: bestChunk.pageNum,
      documentName: bestDoc.name,
      docId: bestDoc.id,
      docName: bestDoc.name,
      fullParagraph: bestChunk.text,
      isManualVerify: false,
    };
  }

  // 5. If no trustworthy reference is detected, flag as needing manual verification
  return {
    id: "manual-verify-" + Math.floor(Math.random() * 10000),
    text: findingText,
    pageNum: 1,
    documentName: "Tidak Ditemukan Referensi Dokumen",
    isManualVerify: true,
  };
}
