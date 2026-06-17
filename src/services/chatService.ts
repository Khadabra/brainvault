import { ChatMessage } from "../types/chat";

const HISTORY_STORAGE_PREFIX = "brainvault_chat_";

export const chatService = {
  /**
   * Send the current user prompt, context, and chat history to the backend.
   */
  async askQuestion(
    prompt: string,
    documentContext: string,
    history: ChatMessage[]
  ): Promise<string> {
    // Incorporate the entire message history structured for the Gemini contents schema:
    // [{ role: "user", parts: [{ text: "..." }] }, { role: "model", parts: [{ text: "..." }] }]
    const formattedHistory = history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    }));

    // Append the current active prompt to content array so model receives the latest turn
    formattedHistory.push({
      role: "user",
      parts: [{ text: prompt }],
    });

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        documentContext,
        chatHistory: formattedHistory,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Koneksi gagal dengan status server: ${response.status}`
      );
    }

    const data = await response.json();
    return data.answer || "Tidak ada jawaban yang dihasilkan oleh AI.";
  },

  /**
   * Persist a document's chat history to LocalStorage
   */
  saveChatHistory(documentId: string, messages: ChatMessage[]): void {
    try {
      localStorage.setItem(`${HISTORY_STORAGE_PREFIX}${documentId}`, JSON.stringify(messages));
    } catch (error) {
      console.error(`Failed to save chat history for doc ${documentId}:`, error);
    }
  },

  /**
   * Load chat history for a document from LocalStorage
   */
  loadChatHistory(documentId: string): ChatMessage[] {
    try {
      const data = localStorage.getItem(`${HISTORY_STORAGE_PREFIX}${documentId}`);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error(`Failed to load chat history for doc ${documentId}:`, error);
      return [];
    }
  },

  /**
   * Clear chat history of a document from LocalStorage
   */
  clearChatHistory(documentId: string): void {
    try {
      localStorage.removeItem(`${HISTORY_STORAGE_PREFIX}${documentId}`);
    } catch (error) {
      console.error(`Failed to delete chat history for doc ${documentId}:`, error);
    }
  },
};
