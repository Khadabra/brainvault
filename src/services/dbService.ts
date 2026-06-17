import { DocumentChunk } from "../types/document";

export interface ChunkVector {
  id: string;          // Unique chunk ID
  documentId: string;  // Associated document ID
  text: string;        // Text chunk content
  pageNum: number;     // PDF Page number
  embedding: number[]; // Vector values from Gemini
}

const DB_NAME = "brainvault_vector_db";
const DB_VERSION = 2;
const STORE_NAME = "vectors";
const INDEX_NAME = "documentId";

class DbService {
  private db: IDBDatabase | null = null;

  /**
   * Initializes or fetches connection to IndexedDB
   */
  private initDb(): Promise<IDBDatabase> {
    if (this.db) {
      return Promise.resolve(this.db);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = request.result;
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          // Create index on documentId to query all chunks/vectors of a document quickly
          store.createIndex(INDEX_NAME, INDEX_NAME, { unique: false });
        }
        if (!db.objectStoreNames.contains("chunk_cache")) {
          db.createObjectStore("chunk_cache", { keyPath: "hash" });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error("IndexedDB initialization failed:", request.error);
        reject(new Error("Gagal menginisialisasi penyimpanan IndexedDB."));
      };
    });
  }

  /**
   * Save chunks and their generated embeddings in transactional batch to IndexedDB.
   */
  public async saveDocumentVectors(
    documentId: string,
    chunks: DocumentChunk[],
    embeddings: number[][]
  ): Promise<void> {
    if (chunks.length !== embeddings.length) {
      throw new Error("Mismatch data antara jumlah frament (chunks) dengan jumlah embedding.");
    }

    const db = await this.initDb();

    return new Promise((resolve, reject) => {
      // Start a ReadWrite transaction
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Transaction successfully completed. Saved ${chunks.length} vectors.`);
        resolve();
      };

      transaction.onerror = () => {
        console.error("[IndexedDB] Batch insert transaction failed:", transaction.error);
        reject(transaction.error || new Error("Gagal menyimpan data vector ke database lokal."));
      };

      // Loop through and put records
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = embeddings[i];

        const record: ChunkVector = {
          id: chunk.id,
          documentId,
          text: chunk.text,
          pageNum: chunk.pageNum,
          embedding,
        };

        const request = store.put(record);
        request.onerror = (e) => {
          console.error(`[IndexedDB] Error inserting chunk ID ${chunk.id}:`, request.error);
          // Transact error will trigger transaction rollback
        };
      }
    });
  }

  /**
   * Load all chunks and embeddings for a specific document.
   */
  public async loadDocumentVectors(documentId: string): Promise<ChunkVector[]> {
    const db = await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index(INDEX_NAME);

      // Query database via IndexedDB index
      const request = index.getAll(documentId);

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error(`[IndexedDB] Failed to load vectors for document ${documentId}:`, request.error);
        reject(request.error || new Error("Gagal memuat vector untuk dokumen ini."));
      };
    });
  }

  /**
   * Delete all chunk vectors linked with a specific document ID.
   */
  public async deleteDocumentVectors(documentId: string): Promise<void> {
    const db = await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index(INDEX_NAME);

      // Query only keys (or records) to delete
      const request = index.openCursor(IDBKeyRange.only(documentId));

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          // Delete item pointing to this cursor key
          cursor.delete();
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        console.log(`[IndexedDB] Successfully deleted vectors for document ID: ${documentId}`);
        resolve();
      };

      transaction.onerror = () => {
        console.error(`[IndexedDB] Failed to delete vectors for document ${documentId}:`, transaction.error);
        reject(transaction.error || new Error("Gagal menghapus vector dari database lokal."));
      };
    });
  }

  /**
   * Helper function to get exact stats of stored elements for debug/verification
   */
  public async getStoreStats(): Promise<{ totalVectors: number; documentCounts: Record<string, number> }> {
    const db = await this.initDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();

      let totalVectors = 0;
      const documentCounts: Record<string, number> = {};

      request.onsuccess = (event: any) => {
        const cursor = event.target.result;
        if (cursor) {
          totalVectors++;
          const docId = cursor.value.documentId || "unknown";
          documentCounts[docId] = (documentCounts[docId] || 0) + 1;
          cursor.continue();
        } else {
          resolve({ totalVectors, documentCounts });
        }
      };

      request.onerror = () => {
        reject(request.error || new Error("Gagal mengambil statistik database."));
      };
    });
  }

  /**
   * Get cached embedding for a given chunk hash and model.
   */
  public async getCachedEmbedding(hash: string, model: string): Promise<number[] | null> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(["chunk_cache"], "readonly");
        const store = transaction.objectStore("chunk_cache");
        const request = store.get(hash);

        request.onsuccess = () => {
          const result = request.result;
          if (result && result.model === model && Array.isArray(result.embedding)) {
            resolve(result.embedding);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          resolve(null);
        };
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * Save a single embedding to chunk cache.
   */
  public async saveCachedEmbedding(hash: string, embedding: number[], model: string): Promise<void> {
    const db = await this.initDb();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(["chunk_cache"], "readwrite");
        const store = transaction.objectStore("chunk_cache");
        const record = {
          hash,
          embedding,
          model,
          createdAt: new Date().toISOString()
        };
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
      } catch (err) {
        resolve();
      }
    });
  }

  /**
   * Save entries in batch to chunk cache.
   */
  public async saveCachedEmbeddingsBatch(
    entries: { hash: string; embedding: number[]; model: string }[]
  ): Promise<void> {
    if (entries.length === 0) return;
    const db = await this.initDb();
    return new Promise((resolve) => {
      try {
        const transaction = db.transaction(["chunk_cache"], "readwrite");
        const store = transaction.objectStore("chunk_cache");
        
        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          resolve();
        };

        for (const entry of entries) {
          store.put({
            hash: entry.hash,
            embedding: entry.embedding,
            model: entry.model,
            createdAt: new Date().toISOString()
          });
        }
      } catch (err) {
        resolve();
      }
    });
  }
}

export const dbService = new DbService();
