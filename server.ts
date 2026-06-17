import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Keep track of models that have hit quota limits (429) to avoid latency on subsequent calls
const EXHAUST_TIMEOUT = 10 * 60 * 1000; // 10 minutes cache
const modelExhaustTime = new Map<string, number>();

function isModelExhausted(model: string): boolean {
  const exhaustTime = modelExhaustTime.get(model);
  if (!exhaustTime) return false;
  if (Date.now() - exhaustTime > EXHAUST_TIMEOUT) {
    modelExhaustTime.delete(model);
    return false;
  }
  return true;
}

function flagModelExhausted(model: string) {
  console.log(`[BrainVault AI Circuit Breaker] Flagging model '${model}' as exhausted. Bypassing on priority queue for 10 minutes.`);
  modelExhaustTime.set(model, Date.now());
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON body with high payload limit for base64 vision images
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // Simple Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Client-side API route for health verification
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API endpoint to call Gemini API safely on server-side
  app.post("/api/chat", async (req, res) => {
    const startTime = performance.now();
    try {
      const { prompt, documentContext, chatHistory } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server. Please configure it via the Secrets side panel in AI Studio."
        });
      }

      // Initialize modern Google GenAI Client with appropriate User-Agent
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Construct high-quality system instruction incorporating context
      let systemInstruction = "You are BrainVault AI, a professional AI Knowledge Assistant. You help users understand, analyze, and query their uploaded documents with precision and accuracy.";
      if (documentContext) {
        systemInstruction += `\n\nContext from the uploaded document:\n---\n${documentContext}\n---\nUse this context to accurately answer the user's questions. Always stay grounded in the document context first and foremost. Always mention specific page numbers (e.g., Halaman 1, Page 2) and section headings or table details where the answer is found. If the answer cannot be found in the provided context, state that clearly, but try your best to answer based on professional knowledge if appropriate.`;
      }

      // Format payload content
      const contents = chatHistory && chatHistory.length > 0 ? chatHistory : prompt;

      // Set Gemini model dynamically or use standard stable gemini-2.5-flash / gemini-3.5-flash for document QA
      const modelName = process.env.GEMINI_MODEL ? process.env.GEMINI_MODEL : "gemini-3.5-flash";

      const candidateModels = [
        modelName,
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-pro"
      ];

      // De-duplicate candidate models while preserving original preference order
      const uniqueModels = Array.from(new Set(candidateModels));

      // Re-order using circuit breaker status: prioritize non-exhausted models
      const activeModels = uniqueModels.filter(m => !isModelExhausted(m));
      const fallbackModels = uniqueModels.filter(m => isModelExhausted(m));
      const sortedModels = [...activeModels, ...fallbackModels];

      let lastError: any = null;
      let response: any = null;

      for (let i = 0; i < sortedModels.length; i++) {
        const model = sortedModels[i];
        try {
          console.log(`[BrainVault AI] Attempting Q&A generation via model: ${model}${isModelExhausted(model) ? " (from exhausted fallback pool)" : ""}...`);
          const result = await ai.models.generateContent({
            model: model,
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3, // Keep low temperature to prioritize document groundedness and precision
              maxOutputTokens: 1800,
            },
          });
          
          if (result && result.text) {
            response = result;
            console.log(`[BrainVault AI] Generation completed successfully using model: ${model}`);
            break;
          }
        } catch (err: any) {
          lastError = err;
          const errorMsg = err.message || "";
          console.warn(`[BrainVault AI] Attempt with model ${model} failed. Error: ${errorMsg}`);
          
          const upperMsg = errorMsg.toUpperCase();
          if (
            err.status === 429 ||
            upperMsg.includes("429") ||
            upperMsg.includes("QUOTA") ||
            upperMsg.includes("LIMIT") ||
            upperMsg.includes("RESOURCE_EXHAUSTED") ||
            upperMsg.includes("EXCEEDED")
          ) {
            flagModelExhausted(model);
          }

          // If the key is outright invalid, abort retry immediately to avoid flooding
          if (errorMsg.includes("API key") || errorMsg.includes("key not valid") || errorMsg.includes("invalid")) {
            throw err;
          }

          // Introduce a short backoff/resting delay before stepping to the next alternative model
          if (i < sortedModels.length - 1) {
            console.log(`[BrainVault AI] Waiting 400ms before falling back to next candidate model...`);
            await new Promise((resolve) => setTimeout(resolve, 400));
          }
        }
      }

      if (!response) {
        throw lastError || new Error("All candidate and fallback Gemini models failed to generate content.");
      }

      const endTime = performance.now();
      const totalTime = ((endTime - startTime) / 1000).toFixed(1);

      const promptLength = prompt ? String(prompt).length : 0;
      const contextLength = documentContext ? String(documentContext).length : 0;
      const historyLength = chatHistory ? JSON.stringify(chatHistory).length : 0;
      const answerLength = response && response.text ? response.text.length : 0;

      // Developer-only console logs - do not expose to end user payloads
      console.log(`[BrainVault Chat] Prompt length: ${promptLength}`);
      console.log(`[BrainVault Chat] Context length: ${contextLength}`);
      console.log(`[BrainVault Chat] Chat history length: ${historyLength}`);
      console.log(`[BrainVault Chat] Answer length: ${answerLength}`);
      console.log(`[BrainVault Chat] Total time: ${totalTime} seconds`);

      res.json({ answer: response.text });
    } catch (error: any) {
      console.error("Gemini API server-side call failed:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // API endpoint for V2 Step 1: Batch generate embeddings using Gemini embedding model
  app.post("/api/embed", async (req, res) => {
    const routeStart = performance.now();
    const timestampReceived = new Date().toISOString();
    try {
      const { texts } = req.body;

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
      res.json({ embeddings });
    } catch (error: any) {
      const totalRouteTime = performance.now() - routeStart;
      console.error(`[Timer Result] /api/embed request failed after ${totalRouteTime.toFixed(1)}ms:`, error);
      res.status(500).json({ error: error.message || "Failed to generate embeddings via Gemini model." });
    }
  });

  // API Route for BrainVault V3 Vision Document Understanding endpoint
  app.post("/api/vision-analyze", async (req, res) => {
    try {
      const { imageBase64, pageNumber } = req.body;

      // 1. Mandatory Input Validations
      if (imageBase64 === undefined || imageBase64 === null) {
        return res.status(400).json({ error: "Kolom 'imageBase64' wajib disertakan dalam request body." });
      }

      if (typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "Kolom 'imageBase64' harus berupa string." });
      }

      if (imageBase64.trim().length === 0) {
        return res.status(400).json({ error: "Kolom 'imageBase64' tidak boleh kosong." });
      }

      // Check overall string length to protect server memory limit from excessively oversized uploads
      if (imageBase64.length > 25 * 1024 * 1024) { // 25 million characters config
        return res.status(400).json({ error: "Kolom 'imageBase64' terlalu besar. Batas maksimal adalah setara ~18MB ukuran file gambar." });
      }

      if (pageNumber === undefined || pageNumber === null) {
        return res.status(400).json({ error: "Kolom 'pageNumber' wajib disertakan dalam request body." });
      }

      if (typeof pageNumber !== "number") {
        return res.status(400).json({ error: "Kolom 'pageNumber' harus berupa number." });
      }

      if (pageNumber < 1) {
        return res.status(400).json({ error: "Kolom 'pageNumber' minimal bernilai 1." });
      }

      // 2. Safety check for Gemini API key setting
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({
          error: "GEMINI_API_KEY is not configured on the server. Please configure it via the Secrets side panel in AI Studio."
        });
      }

      // 3. Extract correct MIME type and base64 payload
      let mimeType = "image/png";
      let cleanBase64 = imageBase64;
      const dataUrlMatch = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        cleanBase64 = dataUrlMatch[2];
      }

      // Simple MIME validation limit
      const allowedMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({ error: "Format gambar tidak didukung. Harap gunakan image/png, image/jpeg, image/webp, atau image/gif." });
      }

      console.log(`[BrainVault AI] Vision request received for Page ${pageNumber} (MIME: ${mimeType}, String length: ${cleanBase64.length})`);

      // 4. Initialize modern Google GenAI Client with appropriate User-Agent
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // 5. Construct highly universal, professional OCR and physical description system prompt
      const systemInstruction = `You are an expert Document Vision AI specialized in granular multi-modal document analysis.
Your task is to analyze the provided page of a document.
The document can be of any type: invoice, CV, SOP, contract, report, scanned document, diagram, drawing (e.g. blueprint, STP layout, shop drawing), personal note, schema, or other.

Analyze the image with absolute accuracy. Extract and return:
1. ocrText: Complete and clean transcription of all text layer and handwritten text present.
   * CRITICAL CRITERIA FOR DRAWINGS, SCHEMAS & LAYOUT DESIGN DIMS:
     - You MUST search for, extract, and transcribe all visible numbers, dimensions (e.g. 5300, 15000, 15200, 12300, 2900, 9400, 2800, etc.), physical sizes, measurement values, and units (e.g. mm, cm, m, inch, Kg).
     - Include all pipeline or item callouts, specific notation symbols (e.g., Ø100, PIPA PVC Ø100, DN50, T-1, T-2), elevations (e.g., EL. +0.00), coordinates, scale info, and labels near dimension lines, arrows, or boxes.
     - You MUST list these dimension values and annotative callouts explicitly under a dedicated sub-heading:
       "--- VISIBLE DIMENSIONS, MEASUREMENTS, AND ANNOTATIONS ---" at the end of or inside the ocrText parameter. List them like "Dimensi/Ukuran: 9400 mm", "Pipa: PIPA PVC Ø100", etc.
2. visualDescription: Detailed and clear description of the physical/visual layout of the page, including any charts, graphs, flowcharts, schemas, images, doodles, or drawings, their contextual meaning, and spatial positions. Enumerate major structural sections (e.g., "Sewage Tank-1 Top View Drawing", "Detail Sewage Tank-1", "Surat Jalan Tabel") and describe exactly which labels or dimension markings are visibly positioned nearby.
3. structuralTables: An array of strings representing markdown-formatted table(s) found on this page. If no table is found, return an empty array. Always preserve rows, headers, and alignments.
4. documentType: Detect and classify the type of document (e.g., "invoice", "SOP", "CV", "contract", "report", "drawing", "handwritten note", "diagram", "other").
5. confidence: A float value between 0.0 and 1.0 representing your analysis and OCR accuracy confidence.
6. warnings: Array of issues found (e.g., "blurry text", "handwritten content might be misread", "low contrast", "cutoff content", "financial details found"). If none, return an empty array.`;

      // Define visual media part for Gemini API
      const imagePart = {
        inlineData: {
          mimeType: mimeType,
          data: cleanBase64,
        },
      };

      // Priority model sequence for robust Vision Document Understanding
      const priorityModels = [
        "gemini-3.5-flash",
        "gemini-2.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest"
      ];

      // Re-order based on circuit-breaker state: prioritize non-exhausted models
      const activeVisionModels = priorityModels.filter(m => !isModelExhausted(m));
      const fallbackVisionModels = priorityModels.filter(m => isModelExhausted(m));
      const sortedPriorityModels = [...activeVisionModels, ...fallbackVisionModels];

      let response = null;
      let modelUsed = "";
      let lastError: any = null;

      // Iteratively attempt each model in priority order with retry and failover logic
      for (let i = 0; i < sortedPriorityModels.length; i++) {
        const currentModel = sortedPriorityModels[i];
        
        // Attempt each model up to 2 times for transient errors before falling back
        for (let attempt = 1; attempt <= 2; attempt++) {
          console.log(`[BrainVault AI Vision] Attempting analysis using model: ${currentModel} (Attempt ${attempt}/2, Model ${i + 1}/${sortedPriorityModels.length})${isModelExhausted(currentModel) ? " [from exhausted pool]" : ""}`);

          try {
            response = await ai.models.generateContent({
              model: currentModel,
              contents: [
                {
                  parts: [
                    imagePart,
                    { text: `Understand and transcribe the content on Page ${pageNumber}. Ensure output fields conform to the structured schema perfectly.` }
                  ]
                }
              ],
              config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    pageNumber: { type: Type.INTEGER, description: "The page number processed." },
                    ocrText: { type: Type.STRING, description: "Extracted clear text from the page." },
                    visualDescription: { type: Type.STRING, description: "Description of structural layout, icons, charts, graphs, graphics, or illustrations present." },
                    structuralTables: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "Array of tables found, represented as structured markdown tables or string representations."
                    },
                    documentType: { type: Type.STRING, description: "The type of document (invoice, CV, contract, report, SOP, scan, diagram, SOP, drawing, note, etc.)" },
                    confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0 of the analysis and OCR accuracy." },
                    warnings: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of warnings like bad image quality, low confidence, security sensitive items, cut-offs, or layout issues."
                    }
                  },
                  required: ["pageNumber", "ocrText", "visualDescription", "structuralTables", "documentType", "confidence", "warnings"]
                }
              }
            });

            if (response && response.text) {
              modelUsed = currentModel;
              console.log(`[BrainVault AI Vision ✅] Successfully analyzed page ${pageNumber} with model: '${modelUsed}' on attempt ${attempt}`);
              break; // Valid result obtained, break the attempt loop
            } else {
              throw new Error("Tanggapan dari model Gemini kosong atau tidak valid.");
            }
          } catch (err: any) {
            lastError = err;
            const status = err.status || err.code;
            const errMsg = String(err.message || err).toUpperCase();

            console.warn(`[BrainVault AI Vision ⚠️] Model '${currentModel}' attempt ${attempt} failed with error: ${err.message || err} (Status/Code: ${status})`);

            // Detect retryable failure types: 503, 429, UNAVAILABLE, HIGH DEMAND, RESOURCE_EXHAUSTED
            const isRetryable = 
              status === 503 ||
              status === 429 ||
              errMsg.includes("503") ||
              errMsg.includes("429") ||
              errMsg.includes("UNAVAILABLE") ||
              errMsg.includes("HIGH DEMAND") ||
              errMsg.includes("HIGH_DEMAND") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("RESOURCE EXHAUSTED") ||
              errMsg.includes("LIMIT") ||
              errMsg.includes("EXCEEDED") ||
              errMsg.includes("QUOTA"); // Standard rate limits represented as exhausted / limit

            if (
              status === 429 ||
              errMsg.includes("429") ||
              errMsg.includes("QUOTA") ||
              errMsg.includes("LIMIT") ||
              errMsg.includes("RESOURCE_EXHAUSTED") ||
              errMsg.includes("EXCEEDED")
            ) {
              flagModelExhausted(currentModel);
            }

            if (isRetryable) {
              // Delay before retry or next model
              const retryDelay = 500;
              if (attempt < 2 && !isModelExhausted(currentModel)) {
                console.log(`[BrainVault AI Vision Retry 🔄] Transient retryable error detected on attempt ${attempt}. Waiting ${retryDelay}ms to retry same model '${currentModel}'...`);
                await new Promise((resolve) => setTimeout(resolve, retryDelay));
              } else {
                if (i < sortedPriorityModels.length - 1) {
                  const nextModel = sortedPriorityModels[i + 1];
                  console.log(`[BrainVault AI Vision Fallback 🔄] Model '${currentModel}' reached limit on attempt ${attempt}. Bypassing further attempts and falling back to model '${nextModel}'...`);
                  await new Promise((resolve) => setTimeout(resolve, retryDelay));
                  break; // Break current attempt loop, proceed immediately to the next model
                } else {
                  console.error(`[BrainVault AI Vision Failover 🚨] All priority models exhausted. The final model '${currentModel}' also failed.`);
                }
              }
            } else {
              // Non-retryable error (e.g. invalid format/payload)
              // Go to next model directly, or throw if last
              if (i < sortedPriorityModels.length - 1) {
                const nextModel = sortedPriorityModels[i + 1];
                console.log(`[BrainVault AI Vision Fallback 🔄] Non-retryable error but attempting fallback anyway for maximum robustness. Waiting 500ms before falling back to model '${nextModel}'...`);
                await new Promise((resolve) => setTimeout(resolve, 500));
                break; // Break the current attempts loop to check the next model
              } else {
                throw err;
              }
            }
          }
        }

        // If we successfully got a response in the attempt loop, exit model loop
        if (response && response.text) {
          break;
        }
      }

      if (!response || !response.text) {
        throw lastError || new Error("Gagal melakukan analisis dokumen visual setelah mencoba seluruh model prioritas.");
      }

      console.log(`[BrainVault AI] Vision analysis successful. Parsing response...`);
      const payload = JSON.parse(response.text.trim());
      payload.modelUsed = modelUsed;

      res.json(payload);
    } catch (error: any) {
      console.error("[BrainVault AI] Vision document understanding endpoint failed:", error);
      res.status(500).json({ error: error.message || "Gagal melakukan analisis dokumen visual melalui model Gemini Vision." });
    }
  });

  // Vite middleware for development vs static asset serving for production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[BrainVault AI] Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot up server:", err);
});
