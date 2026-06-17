import { GoogleGenAI } from "@google/genai";
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

  const startTime = performance.now();
  try {
    const { prompt, documentContext, chatHistory } = req.body || {};

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

    return res.status(200).json({ answer: response.text });
  } catch (error: any) {
    console.error("Gemini API server-side call failed:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
