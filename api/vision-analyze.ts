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

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed. This endpoint only supports POST requests." });
  }

  try {
    const { imageBase64, pageNumber } = req.body || {};

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

    return res.status(200).json(payload);
  } catch (error: any) {
    console.error("[BrainVault AI] Vision document understanding endpoint failed:", error);
    return res.status(500).json({ error: error.message || "Gagal melakukan analisis dokumen visual melalui model Gemini Vision." });
  }
}
