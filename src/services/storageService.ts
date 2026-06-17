import { Document } from "../types/document";

const STORAGE_KEY = "brainvault_documents";
const ACTIVE_DOC_KEY = "brainvault_active_document_id";

// In-Memory storage cache fallback when LocalStorage capacity limits are hit (~5MB browser limit)
let transientDocuments: Document[] = [];

export const storageService = {
  /**
   * Fetch all documents stored in LocalStorage combined with loaded in-memory transient files.
   */
  getDocuments(): Document[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const localDocs: Document[] = data ? JSON.parse(data) : [];
      
      // Filter out duplicates just in case
      const merged = [...localDocs];
      transientDocuments.forEach((tDoc) => {
        if (!merged.some((d) => d.id === tDoc.id)) {
          merged.push(tDoc);
        }
      });
      return merged;
    } catch (error) {
      console.error("Failed to read documents from LocalStorage:", error);
      return [...transientDocuments];
    }
  },

  /**
   * Save a single new document with automatic transient memory fallback if browser storage is full.
   */
  saveDocument(doc: Document): { success: boolean; isTransient?: boolean; error?: string } {
    try {
      const currentDocs = this.getDocuments();
      // Ensure we check duplicate based on ID to avoid multiple registration of exactly the same reference
      const exists = currentDocs.some((d) => d.id === doc.id);
      if (exists) {
        return { success: false, error: "Dokumen dengan ID yang sama sudah ada." };
      }

      // Try appending to LocalStorage
      const data = localStorage.getItem(STORAGE_KEY);
      const localDocs: Document[] = data ? JSON.parse(data) : [];
      localDocs.push(doc);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(localDocs));
      return { success: true, isTransient: false };
    } catch (error: any) {
      console.warn("Storage capacity exceeded, falling back to transient memory storage:", error);
      
      if (error.name === "QuotaExceededError" || error.code === 22 || error.message?.toLowerCase().includes("quota")) {
        // Store in transient memory only for active runtime session
        doc.isTransient = true;
        
        // Ensure no duplicate exists in transient list
        const exists = transientDocuments.some((d) => d.name === doc.name && d.size === doc.size);
        if (!exists) {
          transientDocuments.push(doc);
        }
        
        return {
          success: true,
          isTransient: true,
          error: "Penyimpanan browser LocalStorage penuh (~5MB). Dokumen berhasil disimpan di 'Sesi Memori Transien' — Dokumen ini tetap dapat di-chatting dalam tab ini, namun akan hilang jika halaman atau browser Anda di-refresh.",
        };
      }
      
      return { success: false, error: "Gagal menyimpan dokumen ke penyimpanan lokal." };
    }
  },

  /**
   * Delete a document by ID.
   */
  deleteDocument(id: string): Document[] {
    try {
      // Clear from in-memory transient files if present
      transientDocuments = transientDocuments.filter((doc) => doc.id !== id);

      // Clear from LocalStorage
      const data = localStorage.getItem(STORAGE_KEY);
      const localDocs: Document[] = data ? JSON.parse(data) : [];
      const filtered = localDocs.filter((doc) => doc.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

      // Clear active document if the deleted one was active
      const activeId = this.getActiveDocumentId();
      if (activeId === id) {
        this.setActiveDocumentId(null);
      }
      
      return this.getDocuments();
    } catch (error) {
      console.error("Failed to delete document from LocalStorage:", error);
      return this.getDocuments();
    }
  },

  /**
   * Get the currently active document ID.
   */
  getActiveDocumentId(): string | null {
    try {
      return localStorage.getItem(ACTIVE_DOC_KEY);
    } catch {
      return null;
    }
  },

  /**
   * Set the currently active document ID.
   */
  setActiveDocumentId(id: string | null): void {
    try {
      if (id === null) {
        localStorage.removeItem(ACTIVE_DOC_KEY);
      } else {
        localStorage.setItem(ACTIVE_DOC_KEY, id);
      }
    } catch (error) {
      console.error("Failed to set active document ID:", error);
    }
  },

  /**
   * Update fields of an existing document.
   */
  updateDocument(id: string, updates: Partial<Document>): boolean {
    try {
      let updated = false;
      const transientIdx = transientDocuments.findIndex((d) => d.id === id);
      if (transientIdx !== -1) {
        transientDocuments[transientIdx] = { ...transientDocuments[transientIdx], ...updates };
        updated = true;
      }

      const data = localStorage.getItem(STORAGE_KEY);
      const localDocs: Document[] = data ? JSON.parse(data) : [];
      const localIdx = localDocs.findIndex((d) => d.id === id);
      if (localIdx !== -1) {
        localDocs[localIdx] = { ...localDocs[localIdx], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localDocs));
        updated = true;
      }
      return updated;
    } catch (e) {
      console.error("Failed to update document metadata:", e);
      return false;
    }
  },
};
