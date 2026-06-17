export type VisionMode = "AUTO" | "STANDARD" | "HYBRID" | "FULL";

export type DocumentStatus = "indexed_native" | "enriching" | "fully_enriched" | "enrichment_partial" | "enrichment_failed";

export interface DocumentChunk {
  id: string;
  text: string;
  pageNum: number;
  sourceType?: "native_text" | "vision_enrichment";
  documentId?: string;
  createdAt?: string;
}

export interface Document {
  id: string;
  name: string;
  size: number; // in bytes
  extractedText?: string; // Kept as optional for compatibility or on-the-fly reconstruction
  extractedTextHash?: string; // SHA-256 hash of extracted text for duplicate detection
  chunks?: DocumentChunk[];
  uploadedAt: string; // ISO String
  isTransient?: boolean; // True if stored in-memory due to local storage capacity limit
  status?: DocumentStatus;
}
