export interface SourceCitation {
  id: string;
  text: string;
  pageNum: number;
  documentName?: string;
  docId?: string;
  docName?: string;
  fullParagraph?: string;
  isManualVerify?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  citations?: SourceCitation[];
}

export interface DocumentChatHistory {
  [documentId: string]: ChatMessage[];
}
