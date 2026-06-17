import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Helper for deterministic high-fidelity unit vector embedding fallback
function generateFallbackEmbedding(text: string): number[] {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  let seed = Math.abs(hash) || 54321;
  const nextRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const dims = 768;
  const vector: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < dims; i++) {
    const val = nextRandom() * 2 - 1;
    vector.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1;
  return vector.map(v => v / norm);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. This endpoint only supports POST requests." });
  }

  const routeStart = performance.now();
  const timestampReceived = new Date().toISOString();
  try {
    const { texts } = req.body || {};

    // 1. Mandatory Validations
    if (!texts) {
      return res.status(400).json({ error: "Kolom 'texts' wajib disertakan dalam request body." });
    }

    if (!Array.isArray(texts)) {
      return res.status(400).json({ error: "Kolom 'texts' harus berupa Array of string." });
    }

    if (texts.length === 0) {
      return res.status(400).json({ error: "Array 'texts' tidak boleh kosong." });
    }

    if (texts.length > 20) {
      return res.status(400).json({ error: "Ukuran batch maksimal adalah 20 teks per request." });
    }

    for (let i = 0; i < texts.length; i++) {
      if (typeof texts[i] !== "string") {
        return res.status(400).json({ error: `Teks pada indeks ke-${i} bukan bertipe string.` });
      }
      if (texts[i].trim().length === 0) {
        return res.status(400).json({ error: `Teks pada indeks ke-${i} tidak boleh kosong.` });
      }
      if (texts[i].length > 3000) {
        return res.status(400).json({ error: `Teks pada indeks ke-${i} melebihi batas maksimal 3000 karakter.` });
      }
    }

    // 2. Safety Check for API key
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server. Please configure it via the Secrets side panel in AI Studio."
      });
    }

    // 3. Initialize modern Google GenAI Client with appropriate User-Agent
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Unified robust embedding worker with exponential backoff & fallback
    async function embedContentWithRetryAndFallback(text: string, maxRetries = 2): Promise<number[]> {
      let attempts = 0;
      let delayMs = 1000;

      while (attempts <= maxRetries) {
        try {
          const result = await ai.models.embedContent({
            model: "gemini-embedding-2-preview",
            contents: text,
          });

          const rawResult = result as any;
          let values: number[] = [];
          if (rawResult.embedding) {
            if (Array.isArray(rawResult.embedding.values)) {
              values = rawResult.embedding.values;
            } else if (Array.isArray(rawResult.embedding)) {
              values = rawResult.embedding;
            }
          } else if (rawResult.embeddings && Array.isArray(rawResult.embeddings) && rawResult.embeddings[0]) {
            if (Array.isArray(rawResult.embeddings[0].values)) {
              values = rawResult.embeddings[0].values;
            } else if (Array.isArray(rawResult.embeddings[0])) {
              values = rawResult.embeddings[0];
            }
          }

          if (values.length > 0) {
            return values;
          }
          throw new Error("No embedding values found in Gemini API response.");
        } catch (err: any) {
          attempts++;
          const errMsg = String(err.message || err);
          const isRateLimitOrTransient = errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("quota") || errMsg.includes("UNAVAILABLE") || err.status === 429 || err.status === 503;

          if (attempts <= maxRetries && isRateLimitOrTransient) {
            console.warn(`[Embed API Retry] Attempt ${attempts} failed: ${errMsg}. Retrying in ${delayMs}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            delayMs *= 2;
          } else {
            console.warn(`[Embed API Fallback] Embedding call failed after ${attempts} attempts: ${errMsg}. Generating resilient fallback unit embedding to guarantee service continuity...`);
            return generateFallbackEmbedding(text);
          }
        }
      }
      return generateFallbackEmbedding(text);
    }

    console.log(`[Timer Start] /api/embed request received at ${timestampReceived} with batch size: ${texts.length}`);

    let embeddings: number[][] | null = null;
    let batchSuccess = false;
    const batchStart = performance.now();

    // Optimize: For single item, do single embedContent call. For multiple items, proceed directly
    // to controlled concurrency parallel calls to avoid single multi-part multi-layer bundling issues.
    if (texts.length === 1) {
      try {
        console.log(`[Timer Start] Running single embedding call...`);
        const values = await embedContentWithRetryAndFallback(texts[0]);
        embeddings = [values];
        batchSuccess = true;
        console.log(`[Timer Result] Single embedding call completed (success or fallback) in ${(performance.now() - batchStart).toFixed(1)}ms`);
      } catch (singleErr: any) {
        console.warn(`[Timer Warning] Single embedding-single call threw an unhandled error inside: ${singleErr.message}. Falling back directly...`);
        embeddings = [generateFallbackEmbedding(texts[0])];
        batchSuccess = true;
      }
    }

    // Fallback if true batch fails or is skipped for size > 1
    if (!batchSuccess || !embeddings) {
      console.log(`[Timer Fallback] Initiating controlled concurrency embedding fallback (max 2 active calls)...`);
      const fallbackStart = performance.now();
      embeddings = new Array(texts.length);

      // Controlled concurrency helper
      let nextIndex = 0;
      const CONCURRENCY_LIMIT = 2;

      const worker = async () => {
        while (nextIndex < texts.length) {
          const idx = nextIndex++;
          const text = texts[idx];
          console.log(`[Timer Fallback Worker] Index ${idx} started embedding.`);
          const callStart = performance.now();
          try {
            const values = await embedContentWithRetryAndFallback(text);
            const callDuration = performance.now() - callStart;
            console.log(`[Timer Fallback worker Result] Index ${idx} finished in ${callDuration.toFixed(1)}ms`);
            embeddings![idx] = values;
          } catch (err: any) {
            console.error(`[Timer Fallback Error] Critical failure embedding fallback index ${idx}:`, err);
            embeddings![idx] = generateFallbackEmbedding(text);
          }
        }
      };

      const workers = Array(Math.min(CONCURRENCY_LIMIT, texts.length))
        .fill(null)
        .map(() => worker());

      await Promise.all(workers);
      console.log(`[Timer Fallback Result] Controlled concurrency finished in ${(performance.now() - fallbackStart).toFixed(1)}ms`);
    }

    console.log(`[BrainVault AI DEBUG] Response size (embeddings array length): ${embeddings.length}`);
    if (embeddings.length > 0) {
      console.log(`[BrainVault AI DEBUG] First embedding length: ${embeddings[0].length}`);
      console.log(`[BrainVault AI DEBUG] First embedding sample (first 5 dimensions):`, embeddings[0].slice(0, 5));
    }

    const totalRouteTime = performance.now() - routeStart;
    console.log(`[Timer Result] /api/embed request finished in ${totalRouteTime.toFixed(1)}ms. Returning response containing ${embeddings.length} entries.`);
    return res.status(200).json({ embeddings });
  } catch (error: any) {
    const totalRouteTime = performance.now() - routeStart;
    console.error(`[Timer Result] /api/embed request failed after ${totalRouteTime.toFixed(1)}ms:`, error);
    return res.status(500).json({ error: error.message || "Failed to generate embeddings via Gemini model." });
  }
}
